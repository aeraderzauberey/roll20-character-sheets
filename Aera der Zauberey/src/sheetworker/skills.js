const REFLEXES_SYMLINK_KEY = "calc_symlink_Reflexe";
const INITIATIVE_BASE_KEY = "calc_initiative_base";

const skillList = new RepeatingSection(16, 2, 'skills', (rowPrefix, attributesToSet) => {
    attributesToSet[rowPrefix + '_attribute'] = '-';
});

function getSkillRelatedKeys() {
    let idOrder = skillList.idOrder;
    return [REFLEXES_SYMLINK_KEY].concat(attributes, idOrder.flatMap(id => [
        'name', 'attribute', 'value', 'calc_total'].map(suffix => `repeating_skills_${id}_${suffix}`)));
}

on("sheet:opened", () => {
    skillList.initialize(() => {
        getAttrs(getSkillRelatedKeys(), values => {
            let resultAttributes = {};
            bulkCalculateSkills(values, resultAttributes);
            skillList.generateMinimumRows(resultAttributes);
            writeAttrs(resultAttributes);
        });
    });
});

on(attributes.map(attribute => `change:${attribute}`).join(" "), () => {
    getAttrs(getSkillRelatedKeys(), values => {
        let resultAttributes = {};
        bulkCalculateSkills(values, resultAttributes);
        writeAttrs(resultAttributes);
    });
});

on("clicked:add-skills", function() {
    var newAttributes = {};
    skillList.addNewRow(newAttributes);
    skillList.addNewRow(newAttributes);
    writeAttrs(newAttributes);
});

skillList.onChange(eventInfo => {
    if (/_(value|attribute)$/.test(eventInfo.sourceAttribute)) {
        console.debug("skill change", eventInfo);

        let inputAttributes = ['_value', '_attribute', '_name', '_calc_total'].map(suffix => eventInfo.triggerName
            + suffix);
        getAttrs(inputAttributes, values => {
            let resultAttributes = {};
            bulkCalculateSkills(values, resultAttributes);
            writeAttrs(resultAttributes);
        });
    } else if (/_name$/.test(eventInfo.sourceAttribute)) {
        console.debug("skill renamed", eventInfo);

        if (eventInfo.previousValue == "Reflexe") {
            let resultAttributes = {};
            resultAttributes[REFLEXES_SYMLINK_KEY] = "";
            writeAttrs(resultAttributes);
        } else if (eventInfo.newValue == "Reflexe") {
            let valueKey = eventInfo.sourceAttribute.replace("_name", "_value");
            getAttrs([valueKey, REFLEXES_SYMLINK_KEY], values => {
                let resultAttributes = {};
                addAttrIfChanged(values, REFLEXES_SYMLINK_KEY, values[valueKey], resultAttributes);
                writeAttrs(resultAttributes);
            });
        }
    }

});

skillList.onRemoval((removedInfo, resultAttributes) => {
    const nameKey = Object.keys(removedInfo).filter(key => key.endsWith("_name"))[0];
    if (removedInfo[nameKey] == "Reflexe") {
        resultAttributes[REFLEXES_SYMLINK_KEY] = "";
    }
})

function bulkCalculateSkills(values, resultAttributes) {
    for (const key of Object.keys(values).filter(k => k.endsWith('_value'))) {
        let prefix = key.replace('_value', '');
        calculateSkill(values, prefix, resultAttributes);
    }
}

function calculateSkill(values, prefix, resultAttributes) {
    let rawValue = values[prefix + "_value"];
    let value = parseInt(rawValue) || 0;

    const name = values[prefix + "_name"];
    if (name == "Reflexe") {
        addAttrIfChanged(values, REFLEXES_SYMLINK_KEY, value, resultAttributes);
    }

    let attributeAbbreviation = values[prefix + "_attribute"];

    let result = 0;
    if (attributeAbbreviation != "-") {
        let attributeRawValue = values[attributeAbbreviation];
        let attributeValue = parseInt(attributeRawValue) || 0;
        result = attributeValue + value;
    }
    addAttrIfChanged(values, `${prefix}_calc_total`, result, resultAttributes);
}

on(`sheet:opened change:in change:${REFLEXES_SYMLINK_KEY}`, eventInfo => {
    console.log("initiative base change:", eventInfo.sourceAttribute);
    getAttrs(["in", REFLEXES_SYMLINK_KEY, INITIATIVE_BASE_KEY], values => {
        let integers = getIntegersFrom(values);

        let calculated = 0;
        for (const key of ["in", REFLEXES_SYMLINK_KEY]) {
            calculated += integers[key] * 2;
        }
        console.log("initiative base =", calculated);

        let resultAttributes = {};
        addAttrIfChanged(values, INITIATIVE_BASE_KEY, calculated, resultAttributes);
        writeAttrs(resultAttributes);
    });
});
