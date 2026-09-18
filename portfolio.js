/* =========================================
   RITESH PORTFOLIO JAVASCRIPT
========================================= */


/* =========================================
   PARTICLE BACKGROUND
========================================= */

const canvas =
    document.getElementById("particles");

const ctx =
    canvas.getContext("2d");

let particles = [];

let mouse = {
    x: null,
    y: null
};


function resizeCanvas() {

    canvas.width =
        window.innerWidth *
        window.devicePixelRatio;

    canvas.height =
        window.innerHeight *
        window.devicePixelRatio;

    canvas.style.width =
        window.innerWidth + "px";

    canvas.style.height =
        window.innerHeight + "px";

    ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0
    );

}


resizeCanvas();


window.addEventListener(
    "resize",
    resizeCanvas
);


/* =========================================
   LOGIN & SIGN UP MODAL
========================================= */

const authModal = document.getElementById("authModal");
const authClose = document.getElementById("authClose");
const authMessage = document.getElementById("authMessage");
const authTitle = document.getElementById("authTitle");
const loginLink = document.querySelector(".login-link");

function setAuthView(view) {
    document.querySelectorAll("[data-auth-tab]").forEach(tab => {
        const active = tab.dataset.authTab === view;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active);
    });

    document.querySelectorAll("[data-auth-form]").forEach(form => {
        form.classList.toggle("active", form.dataset.authForm === view);
    });

    authMessage.textContent = "";
    if (authTitle) authTitle.textContent = view === "login" ? "Log in to your account" : "Join my digital world";
}

function openAuth(view = "login") {
    setAuthView(view);
    authModal.classList.add("open");
    authModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.querySelector(`[data-auth-form="${view}"] input`)?.focus(), 100);
}

function closeAuth() {
    authModal.classList.remove("open");
    authModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    loginLink?.focus();
}

document.querySelectorAll("[data-auth-open]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        openAuth();
    });
});

authClose?.addEventListener("click", closeAuth);
authModal?.addEventListener("click", event => {
    if (event.target === authModal) closeAuth();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && authModal?.classList.contains("open")) closeAuth();
});

document.querySelectorAll("[data-auth-tab], [data-auth-switch]").forEach(button => {
    button.addEventListener("click", () => setAuthView(button.dataset.authTab || button.dataset.authSwitch));
});

document.querySelectorAll(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const input = button.previousElementSibling;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        button.textContent = show ? "Hide" : "Show";
        button.setAttribute("aria-label", `${show ? "Hide" : "Show"} password`);
    });
});

document.querySelectorAll("[data-auth-form]").forEach(form => {
    form.addEventListener("submit", event => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = new FormData(form);
        const name = data.get("name") || data.get("email").split("@")[0];
        localStorage.setItem("riteshPortfolioUser", name);
        authMessage.textContent = form.dataset.authForm === "signup"
            ? `Account created — welcome, ${name}!`
            : `Welcome back, ${name}!`;
        loginLink.textContent = "Logged in";
        setTimeout(closeAuth, 1100);
    });
});

const savedUser = localStorage.getItem("riteshPortfolioUser");
if (savedUser && loginLink) loginLink.textContent = "Logged in";


/* Create particles */

const particleCount =
    Math.min(
        120,
        Math.floor(window.innerWidth / 10)
    );


for (
    let i = 0;
    i < particleCount;
    i++
) {

    particles.push({

        x:
            Math.random() *
            window.innerWidth,

        y:
            Math.random() *
            window.innerHeight,

        size:
            Math.random() * 1.8 + .5,

        speedX:
            (Math.random() - .5) * .3,

        speedY:
            (Math.random() - .5) * .3,

        opacity:
            Math.random() * .7 + .2

    });

}


/* Draw particles */

function drawParticles() {

    ctx.clearRect(
        0,
        0,
        window.innerWidth,
        window.innerHeight
    );


    particles.forEach(p => {

        p.x += p.speedX;
        p.y += p.speedY;


        if (
            p.x < 0 ||
            p.x > window.innerWidth
        ) {

            p.speedX *= -1;

        }


        if (
            p.y < 0 ||
            p.y > window.innerHeight
        ) {

            p.speedY *= -1;

        }


        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            `rgba(0,229,255,${p.opacity})`;

        ctx.fill();

    });


    /* Connections */

    for (
        let i = 0;
        i < particles.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < particles.length;
            j++
        ) {

            const dx =
                particles[i].x -
                particles[j].x;

            const dy =
                particles[i].y -
                particles[j].y;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (distance < 110) {

                ctx.beginPath();

                ctx.moveTo(
                    particles[i].x,
                    particles[i].y
                );

                ctx.lineTo(
                    particles[j].x,
                    particles[j].y
                );

                ctx.strokeStyle =
                    `rgba(124,92,255,
                    ${0.12 -
                    distance / 1100})`;

                ctx.lineWidth = .5;

                ctx.stroke();

            }

        }

    }


    requestAnimationFrame(
        drawParticles
    );

}


drawParticles();


/* =========================================
   MOUSE POSITION
========================================= */

document.addEventListener(
    "mousemove",
    e => {

        mouse.x = e.clientX;
        mouse.y = e.clientY;

    }
);


/* =========================================
   CUSTOM CURSOR
========================================= */

const cursor =
    document.querySelector(".cursor");

const cursorDot =
    document.querySelector(".cursor-dot");


document.addEventListener(
    "mousemove",
    e => {

        cursor.style.left =
            e.clientX + "px";

        cursor.style.top =
            e.clientY + "px";


        cursorDot.style.left =
            e.clientX + "px";

        cursorDot.style.top =
            e.clientY + "px";

    }
);


/* Cursor hover */

document.querySelectorAll(
    "a, button, .project-card, .skill-card"
).forEach(element => {

    element.addEventListener(
        "mouseenter",
        () => {

            cursor.style.width = "55px";
            cursor.style.height = "55px";

        }
    );


    element.addEventListener(
        "mouseleave",
        () => {

            cursor.style.width = "35px";
            cursor.style.height = "35px";

        }
    );

});


/* =========================================
   SCROLL REVEAL
========================================= */

const revealElements =
    document.querySelectorAll(
        ".reveal"
    );


const revealObserver =
    new IntersectionObserver(

        entries => {

            entries.forEach(
                entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "active"
                        );

                    }

                }
            );

        },

        {
            threshold: .12
        }

    );


revealElements.forEach(
    element => {

        revealObserver.observe(
            element
        );

    }
);


/* =========================================
   SKILL BAR ANIMATION
========================================= */

const skillBars =
    document.querySelectorAll(
        ".progress-bar"
    );


const skillObserver =
    new IntersectionObserver(

        entries => {

            entries.forEach(
                entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        const bar =
                            entry.target;

                        const width =
                            bar.dataset.width;

                        bar.style.width =
                            width;

                        skillObserver.unobserve(
                            bar
                        );

                    }

                }
            );

        },

        {
            threshold: .5
        }

    );


skillBars.forEach(
    bar => {

        skillObserver.observe(
            bar
        );

    }
);


/* =========================================
   3D CARD TILT
========================================= */

const tiltCards =
    document.querySelectorAll(
        ".tilt"
    );


tiltCards.forEach(card => {

    card.addEventListener(
        "mousemove",
        e => {

            const rect =
                card.getBoundingClientRect();


            const x =
                e.clientX -
                rect.left;


            const y =
                e.clientY -
                rect.top;


            const centerX =
                rect.width / 2;


            const centerY =
                rect.height / 2;


            const rotateX =
                ((y - centerY) /
                centerY) * -6;


            const rotateY =
                ((x - centerX) /
                centerX) * 6;


            card.style.transform =
                `perspective(1000px)
                 rotateX(${rotateX}deg)
                 rotateY(${rotateY}deg)
                 translateY(-8px)`;

        }
    );


    card.addEventListener(
        "mouseleave",
        () => {

            card.style.transform =
                "";

        }
    );

});


/* =========================================
   ABOUT IMAGE TILT
========================================= */

const aboutImage =
    document.querySelector(
        ".about-image img"
    );


if (aboutImage) {

    aboutImage.addEventListener(
        "mousemove",
        e => {

            const rect =
                aboutImage.getBoundingClientRect();


            const x =
                e.clientX -
                rect.left;


            const y =
                e.clientY -
                rect.top;


            const rotateY =
                ((x / rect.width) - .5) *
                12;


            const rotateX =
                ((y / rect.height) - .5) *
                -12;


            aboutImage.style.transform =
                `perspective(800px)
                 rotateX(${rotateX}deg)
                 rotateY(${rotateY}deg)
                 scale(1.03)`;

        }
    );


    aboutImage.addEventListener(
        "mouseleave",
        () => {

            aboutImage.style.transform =
                "";

        }
    );

}


/* =========================================
   MOBILE MENU
========================================= */

const menuBtn =
    document.getElementById(
        "menuBtn"
    );

const navLinks =
    document.querySelector(
        ".nav-links"
    );


if (menuBtn) {

    menuBtn.addEventListener(
        "click",
        () => {

            navLinks.classList.toggle(
                "active"
            );

        }
    );

}


/* Close mobile menu */

document.querySelectorAll(
    ".nav-links a"
).forEach(link => {

    link.addEventListener(
        "click",
        () => {

            navLinks.classList.remove(
                "active"
            );

        }
    );

});


/* =========================================
   HERO PARALLAX
========================================= */

const hero3D =
    document.querySelector(
        ".hero-3d"
    );


document.addEventListener(
    "mousemove",
    e => {

        if (
            window.innerWidth < 800 ||
            !hero3D
        ) {
            return;
        }


        const x =
            (e.clientX /
            window.innerWidth - .5);


        const y =
            (e.clientY /
            window.innerHeight - .5);


        hero3D.style.transform =
            `translate(
                ${x * 20}px,
                ${y * 20}px
            )`;

    }
);


/* =========================================
   NAVBAR SCROLL EFFECT
========================================= */

const navbar =
    document.querySelector(
        ".navbar"
    );


window.addEventListener(
    "scroll",
    () => {

        if (
            window.scrollY > 50
        ) {

            navbar.style.background =
                "rgba(3,3,11,.9)";

        } else {

            navbar.style.background =
                "rgba(5,5,15,.65)";

        }

    }
);
