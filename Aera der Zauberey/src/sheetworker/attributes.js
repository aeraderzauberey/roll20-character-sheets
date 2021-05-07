
for (const abbreviation of attributes) {
    addAttributeListener(abbreviation);
}

function addAttributeListener(abbreviation) {
    const targetKey = "calc_total_" + abbreviation;
    // TODO create registry of startup handlers which specify their input attributes & write to one shared resultAttributes object used for a single writeAttrs call
    on("sheet:opened change:" + abbreviation, function() {
        console.log("attribute change:", abbreviation);
        getAttrs([abbreviation, targetKey].concat(DOMAINS_AND_DRAIN_RELATED), function(values) {
            let integers = getIntegersFrom(values);

            let resultAttributes = {};

            var total = "";
            if (integers[abbreviation]) {
                total = integers[abbreviation] * 2;
            }

            addAttrIfChanged(values, targetKey, total, resultAttributes);

            let drainAttributeAbbreviation = values.drain_attribute;
            if (drainAttributeAbbreviation === abbreviation) {
                console.log("recalculating drain");
                calculateAllDrainRolls(integers, drainAttributeAbbreviation, resultAttributes);
            }

            writeAttrs(resultAttributes);

            // FIXME recalculate skill values due to attribute change
        });
    });
}
