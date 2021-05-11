on("clicked:toggle_apply_penalty", () => {
    getAttrs(["apply_penalty"], (v) => {
        setAttrs({
            "apply_penalty": v["apply_penalty"] !== "1" ? "1" : "0"
        });
    });
});

console.log("AdZ sheetworker initialized");
