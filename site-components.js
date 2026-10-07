const activitySteps = [
    ["Visão geral", "atividade-1/index.html"],
    ["Servidor", "atividade-1/server-hardening.html"],
    ["Apache", "atividade-1/apache2.html"],
    ["HTTPS", "atividade-1/tls-apache2.html"],
    ["PHP e MySQL", "atividade-1/mysql-php.html"],
    ["Subdomínio 1", "atividade-1/deploy-subdomain1.html"],
    ["Subdomínio 2", "atividade-1/deploy-subdomain2.html"],
];

const githubIcon = `<svg class="github-icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
</svg>`;

function normalizePath(path) {
    return path.replace(/\/+$/, "") || "/";
}

function addPointerBehavior(menu) {
    let openedByPointer = false;

    menu.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse" && !menu.open) {
            menu.open = true;
            openedByPointer = true;
        }
    });

    menu.addEventListener("pointerleave", (event) => {
        if (event.pointerType === "mouse" && openedByPointer && !menu.matches(":focus-within")) {
            menu.open = false;
            openedByPointer = false;
        }
    });

    menu.addEventListener("focusout", () => {
        if (openedByPointer && !menu.matches(":hover")) {
            menu.open = false;
            openedByPointer = false;
        }
    });

    menu.querySelector("summary").addEventListener("click", (event) => {
        if (openedByPointer) {
            event.preventDefault();
        }
    });
}

class SiteHeader extends HTMLElement {
    connectedCallback() {
        const root = this.getAttribute("root") || "./";
        const currentPath = normalizePath(location.pathname);
        const rootPage = normalizePath(new URL(`${root}index.html`, location.href).pathname);
        const activity1Pages = activitySteps.map(([, href]) =>
            normalizePath(new URL(`${root}${href}`, location.href).pathname));
        const activity2Page = normalizePath(new URL(`${root}atividade-2/index.html`, location.href).pathname);
        const activity3Page = normalizePath(new URL(`${root}atividade-3/index.html`, location.href).pathname);
        const activity = activity1Pages.includes(currentPath) ? "1"
            : currentPath === activity2Page ? "2"
                : currentPath === activity3Page ? "3" : "";
        const activity1Links = activitySteps.map(([label, href]) => {
            const targetPath = normalizePath(new URL(`${root}${href}`, location.href).pathname);
            const current = targetPath === currentPath ? ' aria-current="page"' : "";
            return `<a href="${root}${href}"${current}>${label}</a>`;
        }).join("");

        this.innerHTML = `
            <div class="topbar">
                <div class="shell topbar-inner">
                    <a class="brand" href="${root}index.html"><span class="brand-mark">~/</span> Redes de Computadores</a>
                    <nav aria-label="Navegação principal">
                        <a href="${root}index.html"${currentPath === rootPage ? ' aria-current="page"' : ""}>Início</a>
                        <details class="activity-menu${activity ? " is-active" : ""}">
                            <summary>Atividades</summary>
                            <div class="activity-menu-items">
                                <section class="activity-menu-section activity-menu-section--steps">
                                    <span class="activity-menu-heading">Atividade 1</span>
                                    ${activity1Links}
                                </section>
                                <section class="activity-menu-section">
                                    <span class="activity-menu-heading">Atividade 2</span>
                                    <a href="${root}atividade-2/index.html"${activity === "2" ? ' aria-current="page"' : ""}>
                                        Abrir página <span class="activity-menu-status">Em breve</span>
                                    </a>
                                </section>
                                <section class="activity-menu-section">
                                    <span class="activity-menu-heading">Atividade 3</span>
                                    <a href="${root}atividade-3/index.html"${activity === "3" ? ' aria-current="page"' : ""}>
                                        Abrir página <span class="activity-menu-status">Em breve</span>
                                    </a>
                                </section>
                            </div>
                        </details>
                    </nav>
                </div>
            </div>`;

        this.querySelectorAll(".activity-menu").forEach(addPointerBehavior);
    }
}

class SiteFooter extends HTMLElement {
    connectedCallback() {
        const root = this.getAttribute("root") || "./";
        const currentPath = normalizePath(location.pathname);
        const activityLinks = [1, 2, 3].map((number) => {
            const href = `${root}atividade-${number}/index.html`;
            const current = normalizePath(new URL(href, location.href).pathname) === currentPath
                ? ' aria-current="page"'
                : "";
            return `<a href="${href}"${current}>Atividade ${number}</a>`;
        }).join("");

        this.innerHTML = `
            <footer>
                <div class="shell">
                    <nav class="footer-navigation" aria-label="Navegação do rodapé">
                        <a href="${root}index.html"${normalizePath(new URL(`${root}index.html`, location.href).pathname) === currentPath ? ' aria-current="page"' : ""}>Início</a>
                        ${activityLinks}
                    </nav>
                    <a href="https://github.com/g-matheus/redes" aria-label="Repositório do projeto no GitHub">
                        ${githubIcon}
                        GitHub
                    </a>
                </div>
            </footer>`;
    }
}

customElements.define("site-header", SiteHeader);
customElements.define("site-footer", SiteFooter);
