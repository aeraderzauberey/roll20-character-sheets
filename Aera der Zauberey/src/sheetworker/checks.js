for (const check of standardChecks) {
    addStandardCheckListener(check);
}

function addStandardCheckListener(check) {
    on("sheet:opened change:" + check.attr1 + " change:" + check.attr2, function() {
        console.log("standardCheck change:", check.key);
        getAttrs([check.attr1, check.attr2], function(values) {
            let integers = getIntegersFrom(values);
            let result = {};
            result["calc_check_" + check.key] = integers[check.attr1] + integers[check.attr2];
            setAttrs(result);
        });
    });
}

const checkList = new RepeatingSection(4, 2, 'checks', (rowPrefix, attributesToSet) => {
    console.log("checkList RepeatingSection newRow", rowPrefix);
    attributesToSet[rowPrefix + '_name'] = '';
});

on("sheet:opened", function() {
    checkList.initialize(() => {
        let resultAttributes = {};
        checkList.generateMinimumRows(resultAttributes);
        setAttrs(resultAttributes);
    });
});

on("clicked:add-checks", function() {
    var newAttributes = {};
    checkList.addNewRow(newAttributes);
    checkList.addNewRow(newAttributes);
    setAttrs(newAttributes);
});
