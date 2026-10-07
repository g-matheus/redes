"use strict";

document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-target]");
    if (!button) return;

    const code = document.getElementById(button.dataset.copyTarget);
    if (!code) return;

    const originalText = button.textContent;
    try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = "Copiado!";
    } catch (error) {
        button.textContent = "Falha ao copiar";
        console.error("Não foi possível copiar o código.", error);
    }

    window.setTimeout(() => { button.textContent = originalText; }, 1800);
});
