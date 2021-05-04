
for (const abbreviation of attributes) {
    addAttributeListener(abbreviation);
}

function addAttributeListener(abbreviation) {
    on("sheet:opened change:" + abbreviation, function() {
        console.log("attribute change:", abbreviation);
        getAttrs([abbreviation].concat(DOMAINS_AND_DRAIN_RELATED), function(values) {
            let integers = getIntegersFrom(values);

            let result = {};

            var total = "";
            if (integers[abbreviation]) {
                total = integers[abbreviation] * 2;
            }
            result["calc_total_" + abbreviation] = total;

            let drainAttributeAbbreviation = values.drain_attribute;
            if (drainAttributeAbbreviation === abbreviation) {
                console.log("recalculating drain");
                calculateAllDrainRolls(integers, drainAttributeAbbreviation, result);
            }

            setAttrs(result);

            // FIXME recalculate skill values due to attribute change
        });
    });
}
