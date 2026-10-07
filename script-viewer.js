"use strict";

let scriptViewerId = 0;

function extractGeneratedScript(generator, filename) {
    const openingLine = `cat << 'OUTER_EOF' > ${filename}`;
    const lines = generator.replace(/\r\n?/g, "\n").split("\n");
    const start = lines.indexOf(openingLine);

    if (start === -1) {
        throw new Error(`O arquivo ${filename} não foi encontrado no script gerador.`);
    }

    const end = lines.indexOf("OUTER_EOF", start + 1);
    if (end === -1) {
        throw new Error(`O bloco de geração de ${filename} não foi encerrado corretamente.`);
    }

    return lines.slice(start + 1, end).join("\n");
}

class ScriptViewer extends HTMLElement {
    async connectedCallback() {
        const source = this.getAttribute("src");
        if (!source) {
            this.showError(new Error("O componente precisa informar o arquivo fonte."));
            return;
        }

        this.setAttribute("aria-busy", "true");
        this.innerHTML = '<p class="script-viewer-loading" role="status">Carregando script...</p>';

        try {
            const response = await fetch(new URL(source, document.baseURI));
            if (!response.ok) {
                throw new Error(`Falha ao carregar ${source}: HTTP ${response.status}.`);
            }

            const content = await response.text();
            const filename = this.getAttribute("extract");
            const code = filename ? extractGeneratedScript(content, filename) : content;
            if (!code.trim()) {
                throw new Error(`O arquivo ${filename || source} está vazio.`);
            }

            const codeId = this.getAttribute("code-id") || `script-viewer-code-${++scriptViewerId}`;
            const pre = document.createElement("pre");
            const codeElement = document.createElement("code");
            codeElement.className = "language-bash";
            codeElement.id = codeId;
            pre.append(codeElement);
            this.replaceChildren(pre);
            codeElement.textContent = code;
            codeElement.dispatchEvent(new CustomEvent("bash-code-ready", { bubbles: true }));
            this.setAttribute("aria-busy", "false");
        } catch (error) {
            this.showError(error);
        }
    }

    showError(error) {
        console.error("Não foi possível exibir o script do tutorial.", error);
        this.setAttribute("aria-busy", "false");
        const message = document.createElement("p");
        message.className = "script-viewer-error";
        message.setAttribute("role", "alert");
        message.textContent = `Não foi possível carregar o script: ${error.message}`;
        this.replaceChildren(message);
    }
}

customElements.define("script-viewer", ScriptViewer);
