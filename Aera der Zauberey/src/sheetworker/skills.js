const skillList = new RepeatingSection(16, 2, 'skills', (rowPrefix, attributesToSet) => {
    attributesToSet[rowPrefix + '_attribute'] = '-';
});

on("sheet:opened", function() {
    skillList.initialize(() => {
        let idOrder = skillList.idOrder;

        let inputAttributes = idOrder.flatMap(id => [
            'name', 'attribute', 'value'].map(suffix => `repeating_skills_${id}_${suffix}`));
        bulkCalculateSkills(inputAttributes);

        let resultAttributes = {};
        skillList.generateMinimumRows(resultAttributes);
        setAttrs(resultAttributes);
    });
});

on("clicked:add-skills", function() {
    var newAttributes = {};
    skillList.addNewRow(newAttributes);
    skillList.addNewRow(newAttributes);
    setAttrs(newAttributes);
});

skillList.onChange(eventInfo => {
    console.log("skill change:", eventInfo.sourceAttribute);
    if (/_(value|attribute)$/.test(eventInfo.sourceAttribute)) {
        console.debug("skill change", eventInfo);

        let inputAttributes = ["_value", "_attribute", "_name"].map(s => eventInfo.triggerName + s);
        bulkCalculateSkills(inputAttributes);
    } else if (/_name$/.test(eventInfo.sourceAttribute)) {
        console.debug("skill renamed", eventInfo);

        if (eventInfo.previousValue == "Reflexe") {
            setAttrs({ "calc_symlink_Reflexe": "" });
        } else if (eventInfo.newValue == "Reflexe") {
            var valueId = eventInfo.sourceAttribute.replace("_name", "_value");
            getAttrs([valueId], function(values) {
                setAttrs({ "calc_symlink_Reflexe": values[valueId] });
            });
        }
    }
});

skillList.onRemoval((removedInfo, resultAttributes) => {
    const nameKey = Object.keys(removedInfo).filter(key => key.endsWith("_name"))[0];
    if (removedInfo[nameKey] == "Reflexe") {
        resultAttributes.calc_symlink_Reflexe = "";
    }
})

function bulkCalculateSkills(inputAttributes) {
    getAttrs(inputAttributes.concat(attributes), function(values) {
        console.debug("bulkCalculateSkills with values", values);
        let resultAttributes = {};
        for (const key of Object.keys(values).filter(k => k.endsWith("_value"))) {
            let prefix = key.replace("_value", "");
            calculateSkill(values, prefix, resultAttributes);
        }
        console.log("bulk skill calculation result:", resultAttributes);
        // TODO leave setAttrs() to the call site
        setAttrs(resultAttributes);
    });
}

function calculateSkill(values, prefix, resultAttributes) {
    let rawValue = values[prefix + "_value"];
    let value = parseInt(rawValue) || 0;

    const name = values[prefix + "_name"];
    if (name == "Reflexe") {
        resultAttributes["calc_symlink_" + name] = value;
    }

    let attributeAbbreviation = values[prefix + "_attribute"];

    let result = 0;
    if (attributeAbbreviation != "-") {
        let attributeRawValue = values[attributeAbbreviation];
        let attributeValue = parseInt(attributeRawValue) || 0;

        console.log("calculate " + prefix + " based on values: ", values);
        result = attributeValue + value;
    }
    resultAttributes[prefix + "_calc_total"] = result;
}

on("sheet:opened change:in change:calc_symlink_reflexe", function(eventInfo) {
    console.log("initiative base change:", eventInfo.sourceAttribute);
    getAttrs(["in", "calc_symlink_Reflexe"], function(values) {
        var base = 0;
        for (const value of Object.values(values)) {
            base += parseInt(value) * 2;
        }
        console.log("base=", base);
        setAttrs({ "calc_initiative_base": base });
    });
});
