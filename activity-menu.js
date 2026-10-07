document.querySelectorAll(".activity-menu").forEach((menu) => {
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
});
