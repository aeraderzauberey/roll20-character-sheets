on("sheet:opened", () => {
    getAttrs(attributes.concat(standardChecks.map(check => `calc_check_${check.key}`)), function(values) {
        let integers = getIntegersFrom(values);
        let resultAttributes = {};
        for (const check of standardChecks) {
            calculateStandardCheck(integers, check, resultAttributes);
        }
        writeAttrs(resultAttributes);
    });
});


for (const check of standardChecks) {
    addStandardCheckListener(check);
}

function addStandardCheckListener(check) {
    on(`change:${check.attr1} change:${check.attr2}`, function() {
        console.log("standardCheck change:", check.key);
        getAttrs([check.attr1, check.attr2, makeCheckKey(check)], function(values) {
            let integers = getIntegersFrom(values);
            let resultAttributes = {};
            calculateStandardCheck(integers, check, resultAttributes);
            writeAttrs(resultAttributes);
        });
    });
}

function makeCheckKey(check) {
    return `calc_check_${check.key}`;
}

function calculateStandardCheck(integers, check, resultAttributes) {
    let calculated = integers[check.attr1] + integers[check.attr2];
    addAttrIfChanged(integers, makeCheckKey(check), calculated, resultAttributes);
}

const checkList = new RepeatingSection(4, 2, 'checks', (rowPrefix, attributesToSet) => {
    console.log("checkList RepeatingSection newRow", rowPrefix);
    attributesToSet[rowPrefix + '_name'] = '';
});

on("sheet:opened", function() {
    checkList.initialize(() => {
        let resultAttributes = {};
        checkList.generateMinimumRows(resultAttributes);
        writeAttrs(resultAttributes);
    });
});

on("clicked:add-checks", function() {
    var newAttributes = {};
    checkList.addNewRow(newAttributes);
    checkList.addNewRow(newAttributes);
    writeAttrs(newAttributes);
});
