/* =========================================================
   API — every read/write lives here.
   Each method maps 1:1 to a REST route in the full-stack version.
   ========================================================= */
var Api = (function () {
  var K = { users:"hp:users", jobs:"hp:jobs", apps:"hp:apps", notes:"hp:notes", session:"hp:session" };

  function read(k, d){ try{ var r=localStorage.getItem(k); return r?JSON.parse(r):d; }catch(e){ console.warn(e); return d; } }
  function write(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ console.warn("Could not save:", e); } }
  function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function digest(t){ var h=5381; for(var i=0;i<t.length;i++) h=((h<<5)+h+t.charCodeAt(i))|0; return "d"+(h>>>0).toString(16); }

  return {
    uid:uid,
    users:function(){ return read(K.users,[]); },
    jobs:function(){ return read(K.jobs,[]); },
    apps:function(){ return read(K.apps,[]); },
    notes:function(){ return read(K.notes,[]); },

    // POST /api/auth/register
    register:function(name,email,password,role){
      var users=this.users();
      if(users.some(function(u){return u.email===email.toLowerCase();})) throw new Error("That email is already registered.");
      var u={id:uid(),name:name,email:email.toLowerCase(),pass:digest(password),role:role,
             headline:"",skills:"",company:role==="employer"?name:""};
      users.push(u); write(K.users,users); write(K.session,u.id); return u;
    },
    // POST /api/auth/login
    login:function(email,password){
      var u=this.users().filter(function(u){return u.email===email.toLowerCase()&&u.pass===digest(password);})[0];
      if(!u) throw new Error("Those details do not match an account.");
      write(K.session,u.id); return u;
    },
    logout:function(){ write(K.session,null); },
    me:function(){ var s=read(K.session,null); return s?this.users().filter(function(u){return u.id===s;})[0]||null:null; },
    updateUser:function(patch){
      var users=this.users(), me=this.me();
      users.forEach(function(u){ if(u.id===me.id) Object.keys(patch).forEach(function(k){ u[k]=patch[k]; }); });
      write(K.users,users);
    },

    // POST /api/jobs
    postJob:function(job){
      var all=this.jobs(); job.id=uid(); job.postedAt=Date.now(); job.open=true;
      all.push(job); write(K.jobs,all); return job;
    },
    job:function(id){ return this.jobs().filter(function(j){return j.id===id;})[0]; },
    closeJob:function(id){
      var all=this.jobs(); all.forEach(function(j){ if(j.id===id) j.open=!j.open; }); write(K.jobs,all);
    },
    deleteJob:function(id){
      write(K.jobs,this.jobs().filter(function(j){return j.id!==id;}));
      write(K.apps,this.apps().filter(function(a){return a.jobId!==id;}));
    },

    // POST /api/jobs/:id/apply
    apply:function(application){
      var all=this.apps();
      if(all.some(function(a){return a.jobId===application.jobId&&a.userId===application.userId;}))
        throw new Error("You have already applied to this job.");
      application.id=uid(); application.appliedAt=Date.now(); application.status="submitted";
      all.push(application); write(K.apps,all);
      var job=this.job(application.jobId);
      this.notify(application.userId,"Application sent","Your application for "+job.title+" at "+job.company+" was received.");
      this.notify(job.employerId,"New applicant",application.name+" applied for "+job.title+".");
      return application;
    },
    setStatus:function(appId,status){
      var all=this.apps(), self=this;
      all.forEach(function(a){
        if(a.id===appId){
          a.status=status;
          var job=self.job(a.jobId);
          self.notify(a.userId,"Application update","Your application for "+job.title+" is now marked \u201c"+status+"\u201d.");
        }
      });
      write(K.apps,all);
    },

    // Stands in for the transactional email service (Nodemailer/SendGrid).
    notify:function(userId,title,body){
      var all=this.notes();
      all.push({id:uid(),userId:userId,title:title,body:body,at:Date.now(),read:false});
      write(K.notes,all);
    },
    markRead:function(userId){
      var all=this.notes();
      all.forEach(function(n){ if(n.userId===userId) n.read=true; });
      write(K.notes,all);
    },
    unread:function(userId){
      return this.notes().filter(function(n){return n.userId===userId&&!n.read;}).length;
    },

    seed:function(){
      if(this.jobs().length) return;
      var users=this.users();
      var demo={id:"seed-emp",name:"Nikhil Rao",email:"hiring@northloop.example",pass:"-",role:"employer",company:"Northloop Studio"};
      if(!users.some(function(u){return u.id==="seed-emp";})){ users.push(demo); write(K.users,users); }
      var base=Date.now();
      write(K.jobs,[
        {id:"seed-1",employerId:"seed-emp",company:"Northloop Studio",title:"Junior front-end developer",
         location:"Bengaluru",type:"Full time",remote:"Hybrid",salary:"₹5–7 LPA",
         summary:"Build and maintain the marketing site and the customer dashboard alongside two senior developers.",
         responsibilities:"Turn Figma designs into responsive pages\nFix accessibility issues reported by users\nWrite small React components with tests",
         requirements:"Solid HTML, CSS and JavaScript\nSome React exposure, even from personal projects\nComfortable with Git",
         postedAt:base-172800000,open:true},
        {id:"seed-2",employerId:"seed-emp",company:"Northloop Studio",title:"Web development intern",
         location:"Remote",type:"Internship",remote:"Remote",salary:"₹15,000/month",
         summary:"A three-month internship for students who want to ship real features rather than watch tutorials.",
         responsibilities:"Pair with a mentor twice a week\nShip one small feature each sprint\nWrite up what you learned",
         requirements:"Currently studying, any branch\nHTML and CSS confidence\nA GitHub profile with at least one project",
         postedAt:base-86400000,open:true},
        {id:"seed-3",employerId:"seed-emp",company:"Kettle & Co",title:"Backend developer (Node.js)",
         location:"Pune",type:"Full time",remote:"On site",salary:"₹8–12 LPA",
         summary:"Own the ordering API behind a chain of 40 cafes, from the database schema up.",
         responsibilities:"Design REST endpoints\nKeep p95 latency under 200ms\nWrite integration tests",
         requirements:"Two years with Node.js and Express\nMongoDB or PostgreSQL in production\nUnderstanding of auth and sessions",
         postedAt:base-43200000,open:true}
      ]);
    }
  };
})();

/* =========================================================
   UI
   ========================================================= */
var UI = (function () {
  var view=document.getElementById("view");
  var state={route:"home",jobId:null,filters:{q:"",loc:"",type:""},tab:"jobs",msg:null};

  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function when(ts){ var d=Math.floor((Date.now()-ts)/86400000);
    return d===0?"today":d===1?"yesterday":d+" days ago"; }
  function lines(text){ return String(text||"").split("\n").filter(function(l){return l.trim();}); }

  function go(route,jobId){ state.route=route; if(jobId) state.jobId=jobId; window.scrollTo(0,0); render(); }
  function dashboard(){ var me=Api.me(); go(me&&me.role==="employer"?"employer":"candidate"); }

  function chrome(){
    var me=Api.me();
    document.getElementById("whoami").textContent=me?me.name:"";
    document.getElementById("logoutBtn").classList.toggle("hidden",!me);
    document.getElementById("loginBtn").classList.toggle("hidden",!!me);
    document.getElementById("navDash").classList.toggle("hidden",!me);
    var bell=document.getElementById("navBell");
    bell.classList.toggle("hidden",!me);
    if(me){
      var n=Api.unread(me.id);
      document.getElementById("bellCount").textContent=n?n:"";
      document.getElementById("bellCount").style.display=n?"block":"none";
    }
  }

  function render(){
    chrome();
    var v={home:home,jobs:jobs,job:job,auth:auth,apply:apply,employer:employer,candidate:candidate,post:post,inbox:inbox};
    view.innerHTML=(v[state.route]||home)();
    state.msg=null;
  }

  /* ---------- HOME ---------- */
  function home(){
    var open=Api.jobs().filter(function(j){return j.open;});
    return '<section class="hero">'+
      '<h1>Find the job. Skip the ten-page form.</h1>'+
      '<p>Roles from companies that answer. Apply with your profile and a resume, and see exactly where your application stands.</p>'+
      '<div class="searchbar">'+
        '<input type="text" id="hq" placeholder="Job title or keyword">'+
        '<input type="text" id="hloc" placeholder="City or Remote">'+
        '<button class="btn" onclick="UI.searchFromHome()">Search jobs</button>'+
      '</div>'+
      '<p class="tally">'+open.length+' open roles right now</p>'+
    '</section>'+
    '<div class="page-head"><div><h2>Featured jobs</h2><p>Recently posted and still accepting applications.</p></div>'+
    '<div class="spacer"></div><button class="btn-ghost" onclick="UI.go(\'jobs\')">See all jobs</button></div>'+
    jobList(open.slice().sort(function(a,b){return b.postedAt-a.postedAt;}).slice(0,3));
  }

  function searchFromHome(){
    state.filters.q=document.getElementById("hq").value;
    state.filters.loc=document.getElementById("hloc").value;
    go("jobs");
  }

  /* ---------- JOB LIST ---------- */
  function jobList(list){
    if(!list.length) return '<div class="card empty">No jobs match that search. Try fewer words.</div>';
    return '<div class="grid">'+list.map(function(j){
      return '<article class="card job">'+
        '<div class="badge">'+esc(j.company.charAt(0))+'</div>'+
        '<div style="flex:1;min-width:200px">'+
          '<h3 onclick="UI.go(\'job\',\''+j.id+'\')">'+esc(j.title)+'</h3>'+
          '<p class="co">'+esc(j.company)+' · '+esc(j.location)+'</p>'+
          '<div class="tags"><span class="tag">'+esc(j.type)+'</span><span class="tag">'+esc(j.remote)+'</span>'+
          '<span class="tag pay">'+esc(j.salary)+'</span>'+(j.open?"":'<span class="tag">Closed</span>')+'</div>'+
        '</div>'+
        '<div class="side"><button class="btn" onclick="UI.go(\'job\',\''+j.id+'\')">View role</button>'+
        '<span class="note">Posted '+when(j.postedAt)+'</span></div>'+
      '</article>';
    }).join("")+'</div>';
  }

  function jobs(){
    var f=state.filters;
    var list=Api.jobs().filter(function(j){
      var hay=(j.title+" "+j.company+" "+j.summary).toLowerCase();
      return (!f.q||hay.indexOf(f.q.toLowerCase().trim())>-1)
        && (!f.loc||(j.location+" "+j.remote).toLowerCase().indexOf(f.loc.toLowerCase().trim())>-1)
        && (!f.type||j.type===f.type);
    }).sort(function(a,b){return b.postedAt-a.postedAt;});

    return '<div class="page-head"><div><h2>Job listings</h2><p>'+list.length+' roles found.</p></div></div>'+
      '<div class="card" style="margin-bottom:18px"><div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">'+
        '<div><label for="fq">Keyword</label><input id="fq" type="text" value="'+esc(f.q)+'" oninput="UI.setFilter(\'q\',this.value)" placeholder="React, intern, backend"></div>'+
        '<div><label for="floc">Location</label><input id="floc" type="text" value="'+esc(f.loc)+'" oninput="UI.setFilter(\'loc\',this.value)" placeholder="Pune, Remote"></div>'+
        '<div><label for="ftype">Type</label><select id="ftype" onchange="UI.setFilter(\'type\',this.value)">'+
          ["","Full time","Part time","Internship","Contract"].map(function(t){
            return '<option value="'+t+'" '+(f.type===t?"selected":"")+'>'+(t||"Any type")+'</option>';}).join("")+
        '</select></div>'+
      '</div></div>'+
      '<div id="jobResults">'+jobList(list)+'</div>';
  }

  function setFilter(key,value){
    state.filters[key]=value;
    var f=state.filters;
    var list=Api.jobs().filter(function(j){
      var hay=(j.title+" "+j.company+" "+j.summary).toLowerCase();
      return (!f.q||hay.indexOf(f.q.toLowerCase().trim())>-1)
        && (!f.loc||(j.location+" "+j.remote).toLowerCase().indexOf(f.loc.toLowerCase().trim())>-1)
        && (!f.type||j.type===f.type);
    }).sort(function(a,b){return b.postedAt-a.postedAt;});
    document.getElementById("jobResults").innerHTML=jobList(list);
  }

  /* ---------- JOB DETAIL ---------- */
  function job(){
    var j=Api.job(state.jobId);
    if(!j) return '<div class="card empty">That job is no longer listed.</div>';
    var me=Api.me();
    var applied=me&&Api.apps().some(function(a){return a.jobId===j.id&&a.userId===me.id;});

    return '<button class="btn-quiet" onclick="UI.go(\'jobs\')">← Back to listings</button>'+
      '<div class="split" style="margin-top:12px">'+
        '<div class="card prose">'+
          '<h2 style="font-size:1.5rem">'+esc(j.title)+'</h2>'+
          '<p class="note" style="margin:6px 0 14px">'+esc(j.company)+' · '+esc(j.location)+' · posted '+when(j.postedAt)+'</p>'+
          '<p>'+esc(j.summary)+'</p>'+
          '<h4>What you will do</h4><ul>'+lines(j.responsibilities).map(function(l){return '<li>'+esc(l)+'</li>';}).join("")+'</ul>'+
          '<h4>What we are looking for</h4><ul>'+lines(j.requirements).map(function(l){return '<li>'+esc(l)+'</li>';}).join("")+'</ul>'+
        '</div>'+
        '<div class="card">'+
          '<div class="kv">'+
            '<div><span>Employment</span><b>'+esc(j.type)+'</b></div>'+
            '<div><span>Work setup</span><b>'+esc(j.remote)+'</b></div>'+
            '<div><span>Salary</span><b>'+esc(j.salary)+'</b></div>'+
            '<div><span>Applicants</span><b>'+Api.apps().filter(function(a){return a.jobId===j.id;}).length+'</b></div>'+
          '</div>'+
          '<div style="margin-top:18px">'+
            (!j.open ? '<p class="note" style="margin:0">This role is closed to new applications.</p>'
             : applied ? '<p class="note" style="margin:0">You applied '+when(Api.apps().filter(function(a){return a.jobId===j.id&&a.userId===me.id;})[0].appliedAt)+'. Check your dashboard for updates.</p>'
             : '<button class="btn btn-lg" style="width:100%" onclick="UI.go(\'apply\',\''+j.id+'\')">Apply for this job</button>')+
          '</div>'+
        '</div>'+
      '</div>';
  }

  /* ---------- APPLY ---------- */
  function apply(){
    var j=Api.job(state.jobId), me=Api.me();
    if(!me) return '<div class="card empty"><h2>Log in to apply</h2><p>Applications are tied to your account so you can track them.</p><button class="btn" onclick="UI.go(\'auth\')">Log in or sign up</button></div>';
    if(me.role==="employer") return '<div class="card empty">Employer accounts cannot apply to jobs. Sign up as a candidate instead.</div>';

    return '<button class="btn-quiet" onclick="UI.go(\'job\',\''+j.id+'\')">← Back to the role</button>'+
      '<div class="card" style="margin-top:12px;max-width:620px">'+
        '<h2 style="font-size:1.35rem">Apply: '+esc(j.title)+'</h2>'+
        '<p class="note" style="margin:4px 0 18px">'+esc(j.company)+' · '+esc(j.location)+'</p>'+
        '<div id="applyError"></div>'+
        '<div class="field"><label for="apName">Full name</label><input id="apName" type="text" value="'+esc(me.name)+'"></div>'+
        '<div class="field"><label for="apEmail">Email</label><input id="apEmail" type="email" value="'+esc(me.email)+'"></div>'+
        '<div class="field"><label for="apPhone">Phone</label><input id="apPhone" type="text" placeholder="+91 90000 00000"></div>'+
        '<div class="field"><label for="apNote">Why you are a fit</label><textarea id="apNote" placeholder="Two or three sentences. Mention the most relevant thing you have built."></textarea></div>'+
        '<div class="field"><label for="apFile">Resume (PDF)</label>'+
          '<div class="drop"><input id="apFile" type="file" accept=".pdf,.doc,.docx"><p class="note" style="margin:8px 0 0">PDF or Word, up to 2 MB.</p></div>'+
        '</div>'+
        '<button class="btn btn-lg" onclick="UI.submitApplication(\''+j.id+'\')">Submit application</button>'+
      '</div>';
  }

  function submitApplication(jobId){
    var box=document.getElementById("applyError");
    var name=document.getElementById("apName").value.trim();
    var email=document.getElementById("apEmail").value.trim();
    var phone=document.getElementById("apPhone").value.trim();
    var note=document.getElementById("apNote").value.trim();
    var file=document.getElementById("apFile").files[0];
    box.innerHTML="";

    function fail(m){ box.innerHTML='<div class="error-msg">'+esc(m)+'</div>'; window.scrollTo(0,0); }

    if(!name||!email) return fail("Name and email are required.");
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("That email address does not look right.");
    if(!phone) return fail("Add a phone number so the employer can reach you.");
    if(!file) return fail("Attach your resume before submitting.");
    if(file.size>2*1024*1024) return fail("That file is over 2 MB. Compress it and try again.");

    try{
      var me=Api.me();
      Api.apply({jobId:jobId,userId:me.id,name:name,email:email,phone:phone,note:note,
                 resumeName:file.name,resumeSize:Math.round(file.size/1024)+" KB"});
      state.msg="Application sent. The employer has been notified.";
      go("candidate");
    }catch(err){ fail(err.message); }
  }

  /* ---------- AUTH ---------- */
  function auth(){
    return '<div style="max-width:430px;margin-inline:auto"><div class="card">'+
      '<h2 style="font-size:1.35rem">Log in or create an account</h2>'+
      '<p class="note" style="margin:6px 0 16px">Candidates track applications. Employers post jobs and review applicants.</p>'+
      '<div id="authError"></div>'+
      '<div class="field"><label for="aName">Name <span class="note">(new accounts)</span></label><input id="aName" type="text" placeholder="Ritika Sahni"></div>'+
      '<div class="field"><label for="aRole">I am a</label><select id="aRole"><option value="candidate">Candidate looking for work</option><option value="employer">Employer hiring</option></select></div>'+
      '<div class="field"><label for="aEmail">Email</label><input id="aEmail" type="email" placeholder="you@example.com"></div>'+
      '<div class="field"><label for="aPass">Password</label><input id="aPass" type="password" placeholder="At least 6 characters"></div>'+
      '<div style="display:flex;gap:10px;margin-top:6px">'+
        '<button class="btn" onclick="UI.doAuth(\'login\')">Log in</button>'+
        '<button class="btn-ghost" onclick="UI.doAuth(\'register\')">Create account</button>'+
      '</div>'+
      '<p class="note" style="margin:16px 0 0">Credentials stay in this browser. In the full-stack build this posts to an Express route that hashes with bcrypt and returns a JWT.</p>'+
    '</div></div>';
  }

  function doAuth(mode){
    var box=document.getElementById("authError"); box.innerHTML="";
    var name=document.getElementById("aName").value.trim();
    var email=document.getElementById("aEmail").value.trim();
    var pass=document.getElementById("aPass").value;
    var role=document.getElementById("aRole").value;
    try{
      if(!email||!pass) throw new Error("Enter your email and password.");
      if(mode==="register"){
        if(!name) throw new Error("Enter your name.");
        if(pass.length<6) throw new Error("Use at least 6 characters for the password.");
        Api.register(name,email,pass,role);
      } else { Api.login(email,pass); }
      dashboard();
    }catch(err){ box.innerHTML='<div class="error-msg">'+esc(err.message)+'</div>'; }
  }

  function logout(){ Api.logout(); go("home"); }

  /* ---------- EMPLOYER DASHBOARD ---------- */
  function employer(){
    var me=Api.me();
    if(!me||me.role!=="employer") return '<div class="card empty">Log in with an employer account to see this.</div>';
    var myJobs=Api.jobs().filter(function(j){return j.employerId===me.id;});
    var myApps=Api.apps().filter(function(a){ return myJobs.some(function(j){return j.id===a.jobId;}); });

    var body;
    if(state.tab==="applicants"){
      body=myApps.length
        ? '<div class="card"><table><thead><tr><th>Candidate</th><th>Role</th><th>Resume</th><th>Applied</th><th>Status</th><th></th></tr></thead><tbody>'+
          myApps.slice().reverse().map(function(a){
            var j=Api.job(a.jobId);
            return '<tr><td><b>'+esc(a.name)+'</b><br><span class="note">'+esc(a.email)+' · '+esc(a.phone)+'</span></td>'+
              '<td>'+esc(j?j.title:"—")+'</td>'+
              '<td><span class="note">'+esc(a.resumeName)+'<br>'+esc(a.resumeSize)+'</span></td>'+
              '<td>'+when(a.appliedAt)+'</td>'+
              '<td><span class="status '+(a.status==="submitted"?"submitted":a.status==="in review"?"review":"rejected")+'">'+esc(a.status)+'</span></td>'+
              '<td style="text-align:right;white-space:nowrap">'+
                '<button class="btn-ghost" onclick="UI.status(\''+a.id+'\',\'in review\')">Shortlist</button> '+
                '<button class="btn-danger" onclick="UI.status(\''+a.id+'\',\'rejected\')">Reject</button>'+
              '</td></tr>';
          }).join("")+'</tbody></table></div>'
        : '<div class="card empty">No applications yet. They will appear here the moment someone applies.</div>';
    } else {
      body=myJobs.length
        ? '<div class="grid">'+myJobs.slice().reverse().map(function(j){
            var count=Api.apps().filter(function(a){return a.jobId===j.id;}).length;
            return '<article class="card job">'+
              '<div class="badge">'+esc(j.company.charAt(0))+'</div>'+
              '<div style="flex:1;min-width:200px"><h3 onclick="UI.go(\'job\',\''+j.id+'\')">'+esc(j.title)+'</h3>'+
              '<p class="co">'+esc(j.location)+' · posted '+when(j.postedAt)+'</p>'+
              '<div class="tags"><span class="tag">'+count+' applicant'+(count===1?"":"s")+'</span>'+
              '<span class="tag">'+(j.open?"Open":"Closed")+'</span></div></div>'+
              '<div class="side">'+
                '<button class="btn-ghost" onclick="UI.toggleJob(\''+j.id+'\')">'+(j.open?"Close role":"Reopen")+'</button>'+
                '<button class="btn-danger" onclick="UI.removeJob(\''+j.id+'\')">Delete</button>'+
              '</div></article>';
          }).join("")+'</div>'
        : '<div class="card empty">You have not posted a job yet.<br><br><button class="btn" onclick="UI.go(\'post\')">Post your first job</button></div>';
    }

    return '<div class="page-head"><div><h2>'+esc(me.company||me.name)+'</h2><p>'+myJobs.length+' roles · '+myApps.length+' applications</p></div>'+
      '<div class="spacer"></div><button class="btn" onclick="UI.go(\'post\')">Post a job</button></div>'+
      '<div class="tabs">'+
        '<button aria-selected="'+(state.tab!=="applicants")+'" onclick="UI.setTab(\'jobs\')">Your jobs</button>'+
        '<button aria-selected="'+(state.tab==="applicants")+'" onclick="UI.setTab(\'applicants\')">Applicants</button>'+
      '</div>'+body;
  }

  function setTab(t){ state.tab=t; render(); }
  function toggleJob(id){ Api.closeJob(id); render(); }
  function removeJob(id){ if(window.confirm("Delete this job and its applications?")){ Api.deleteJob(id); render(); } }
  function status(appId,s){ Api.setStatus(appId,s); render(); }

  /* ---------- POST A JOB ---------- */
  function post(){
    var me=Api.me();
    if(!me||me.role!=="employer") return '<div class="card empty">Only employer accounts can post jobs.</div>';
    return '<button class="btn-quiet" onclick="UI.go(\'employer\')">← Back to dashboard</button>'+
      '<div class="card" style="margin-top:12px;max-width:680px">'+
        '<h2 style="font-size:1.35rem;margin-bottom:16px">Post a job</h2>'+
        '<div id="postError"></div>'+
        '<div class="field"><label for="pTitle">Job title</label><input id="pTitle" type="text" placeholder="Junior front-end developer"></div>'+
        '<div class="field"><label for="pCompany">Company</label><input id="pCompany" type="text" value="'+esc(me.company||me.name)+'"></div>'+
        '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">'+
          '<div class="field"><label for="pLoc">Location</label><input id="pLoc" type="text" placeholder="Pune"></div>'+
          '<div class="field"><label for="pType">Type</label><select id="pType"><option>Full time</option><option>Part time</option><option>Internship</option><option>Contract</option></select></div>'+
          '<div class="field"><label for="pRemote">Setup</label><select id="pRemote"><option>On site</option><option>Hybrid</option><option>Remote</option></select></div>'+
          '<div class="field"><label for="pSalary">Salary</label><input id="pSalary" type="text" placeholder="₹5–7 LPA"></div>'+
        '</div>'+
        '<div class="field"><label for="pSummary">Summary</label><textarea id="pSummary" placeholder="Two sentences on what this person will own."></textarea></div>'+
        '<div class="field"><label for="pResp">Responsibilities <span class="note">one per line</span></label><textarea id="pResp"></textarea></div>'+
        '<div class="field"><label for="pReq">Requirements <span class="note">one per line</span></label><textarea id="pReq"></textarea></div>'+
        '<button class="btn btn-lg" onclick="UI.submitJob()">Publish job</button>'+
      '</div>';
  }

  function submitJob(){
    var box=document.getElementById("postError"); box.innerHTML="";
    function val(id){ return document.getElementById(id).value.trim(); }
    var title=val("pTitle"), company=val("pCompany"), loc=val("pLoc"), summary=val("pSummary");
    if(!title||!company||!loc||!summary){
      box.innerHTML='<div class="error-msg">Title, company, location and summary are all required.</div>';
      window.scrollTo(0,0); return;
    }
    var me=Api.me();
    Api.postJob({employerId:me.id,company:company,title:title,location:loc,
      type:val("pType"),remote:val("pRemote"),salary:val("pSalary")||"Not disclosed",
      summary:summary,responsibilities:document.getElementById("pResp").value,
      requirements:document.getElementById("pReq").value});
    Api.updateUser({company:company});
    state.tab="jobs";
    go("employer");
  }

  /* ---------- CANDIDATE DASHBOARD ---------- */
  function candidate(){
    var me=Api.me();
    if(!me||me.role!=="candidate") return '<div class="card empty">Log in with a candidate account to see this.</div>';
    var mine=Api.apps().filter(function(a){return a.userId===me.id;}).reverse();

    return (state.msg?'<div class="ok-msg">'+esc(state.msg)+'</div>':'')+
      '<div class="page-head"><div><h2>'+esc(me.name)+'</h2><p>'+esc(me.email)+'</p></div>'+
      '<div class="spacer"></div><button class="btn" onclick="UI.go(\'jobs\')">Find jobs</button></div>'+
      '<div class="split">'+
        '<div class="card">'+
          '<h3 style="font-size:1.1rem;margin-bottom:12px">Your applications</h3>'+
          (mine.length
            ? '<table><thead><tr><th>Role</th><th>Company</th><th>Applied</th><th>Status</th></tr></thead><tbody>'+
              mine.map(function(a){ var j=Api.job(a.jobId);
                return '<tr><td>'+esc(j?j.title:"Job removed")+'</td><td>'+esc(j?j.company:"—")+'</td>'+
                  '<td>'+when(a.appliedAt)+'</td>'+
                  '<td><span class="status '+(a.status==="submitted"?"submitted":a.status==="in review"?"review":"rejected")+'">'+esc(a.status)+'</span></td></tr>';
              }).join("")+'</tbody></table>'
            : '<p class="note" style="margin:0">No applications yet. Browse the listings and apply to something.</p>')+
        '</div>'+
        '<div class="card">'+
          '<h3 style="font-size:1.05rem;margin-bottom:12px">Your profile</h3>'+
          '<div class="field"><label for="cHead">Headline</label><input id="cHead" type="text" value="'+esc(me.headline)+'" placeholder="Final-year CS student"></div>'+
          '<div class="field"><label for="cSkills">Skills</label><textarea id="cSkills" placeholder="HTML, CSS, JavaScript, Git">'+esc(me.skills)+'</textarea></div>'+
          '<button class="btn-ghost" onclick="UI.saveProfile()">Save profile</button>'+
          '<p class="note" id="profileSaved" style="margin:10px 0 0"></p>'+
        '</div>'+
      '</div>';
  }

  function saveProfile(){
    Api.updateUser({headline:document.getElementById("cHead").value.trim(),
                    skills:document.getElementById("cSkills").value.trim()});
    document.getElementById("profileSaved").textContent="Profile saved.";
  }

  /* ---------- INBOX ---------- */
  function inbox(){
    var me=Api.me();
    if(!me) return '<div class="card empty">Log in to see your notifications.</div>';
    var list=Api.notes().filter(function(n){return n.userId===me.id;}).reverse();
    Api.markRead(me.id);
    setTimeout(chrome,0);
    return '<div class="page-head"><div><h2>Inbox</h2><p>Updates you would normally receive by email.</p></div></div>'+
      '<div class="card">'+
        (list.length
          ? list.map(function(n){
              return '<div class="notif"><b>'+esc(n.title)+'</b><span>'+esc(n.body)+' · '+when(n.at)+'</span></div>';
            }).join("")
          : '<p class="note empty" style="margin:0">Nothing here yet.</p>')+
      '</div>';
  }

  return {go:go,render:render,dashboard:dashboard,doAuth:doAuth,logout:logout,setFilter:setFilter,
          searchFromHome:searchFromHome,submitApplication:submitApplication,submitJob:submitJob,
          setTab:setTab,toggleJob:toggleJob,removeJob:removeJob,status:status,saveProfile:saveProfile};
})();

Api.seed();
UI.render();
