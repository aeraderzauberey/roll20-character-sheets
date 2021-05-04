const DOMAINS_AND_DRAIN_RELATED = ["drain_attribute"].concat(drainAttributes, domains);
const MAGIC_MATRIX_INPUT = DOMAINS_AND_DRAIN_RELATED.concat(techniques);

function getIntegersFrom(values) {
    let result = {};
    for (const key of Object.keys(values)) {
        result[key] = parseInt(values[key]) || 0;
    }
    return result;
}

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

on("sheet:opened", function() {
    getSectionIDsOrdered("repeating_skills", function(ids) {
        skillIdOrder = ids;

        let valueIds = ids.map(id => "repeating_skills_" + id + "_value");
        let attributeIds = ids.map(id => "repeating_skills_" + id + "_attribute");
        let nameIds = ids.map(id => "repeating_skills_" + id + "_name");
        var inputAttributes = valueIds.concat(attributeIds).concat(nameIds);
        bulkCalculateSkills(inputAttributes);

        var newAttributes = {};
        for (let i = ids.length; i < 16; i++) {
            var newId = generateRowID();
            newAttributes["repeating_skills_" + newId + "_attribute"] = "-";
        }
        setAttrs(newAttributes);

        // Note: calculation of magic cells and drain values is triggered by a separate sheet:opened listener per domain
    });
});

var skillIdOrder = [];

on("clicked:add-skills", function() {
    var newAttributes = {};

    function add() {
        const id = generateRowID();
        newAttributes["repeating_skills_" + id + "_attribute"] = "-";
        skillIdOrder.push(id.toLowerCase());
    }
    add();
    add();

    setAttrs(newAttributes);
    console.debug("add-skills - new skillIdOrder:", skillIdOrder);
});

on("change:repeating_skills", function(eventInfo) {
    console.log("change:", eventInfo.sourceAttribute);
    if (/_(value|attribute)$/.test(eventInfo.sourceAttribute)) {
        console.debug("change", eventInfo);

        let inputAttributes = ["_value", "_attribute", "_name"].map(s => eventInfo.triggerName + s);
        bulkCalculateSkills(inputAttributes);
    } else if (/_name$/.test(eventInfo.sourceAttribute)) {
        console.debug("rename", eventInfo);

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

on("change:_reporder:skills", function(eventInfo) {
    console.debug("change:_reporder:skills - eventInfo:", eventInfo);
    if (eventInfo.newValue) {
        skillIdOrder = eventInfo.newValue.toLowerCase().split(',');
        console.debug("change:_reporder:skills - new skillIdOrder:", skillIdOrder);
    } else {
        console.debug("change:_reporder:skills - event includes no ordering info");
        refreshSkillOrder();
    }
});

on("remove:repeating_skills", function(eventInfo) {
    console.debug("remove:repeating_skills - eventInfo:", eventInfo);

    const removedId = eventInfo.sourceAttribute.match(/^repeating_skills_([^_]+)$/)[1];
    console.info("removedId:", removedId);

    // Store last two skill IDs before updating skillIdOrder
    const lastTwoSkillIds = skillIdOrder.slice(-2);
    console.info("last 2 skills:", lastTwoSkillIds);

    getSectionIDsOrdered("repeating_skills", function(ids) {
        skillIdOrder = ids;
        console.debug("new skillIdOrder:", skillIdOrder);

        const count = ids.length;
        if (count < 16) {
            const newId = addBalancingSkillRow();
            console.info(`user removed a row; appending ${newId} to keep minimum row count`);
        } else if (count % 2 == 1) {
            if (lastTwoSkillIds.includes(removedId.toLowerCase())) {
                console.info(`user removed row ${removedId}, one of the last two rows. balance columns by removing the other row (if empty) or add a new one`);
                const otherRowId = lastTwoSkillIds.filter((lowerId) => lowerId != removedId.toLowerCase())[0];
                balanceSkillRowsAfterTailRemoval(otherRowId);
            } else {
                console.info("user removed non-tail row; appending a new one to keep columns balanced");
                addBalancingSkillRow();
            }
        }
    });

    const nameKey = Object.keys(eventInfo.removedInfo).filter(key => key.endsWith("_name"))[0];
    if (eventInfo.removedInfo[nameKey] == "Reflexe") {
        setAttrs({ "calc_symlink_Reflexe": "" });
    }
});

function balanceSkillRowsAfterTailRemoval(rowId) {
    const ids = ["name", "value"].map(suffix => "repeating_skills_" + rowId + "_" + suffix);
    getAttrs(ids, function(values) {
        const rowIsEmpty = Object.values(values).every((element) => element.length == 0);
        if (rowIsEmpty) {
            console.info(`other row ${rowId} is empty, too - removing.`);
            removeRepeatingRow(`repeating_skills_${rowId}`);
            refreshSkillOrder();
        } else {
            const newId = addBalancingSkillRow();
            console.info(`not removing the remaining non-empty row ${rowId}. keeping columns balanced by adding new row ${newId}.`);
        }
    });
}

function refreshSkillOrder() {
    getSectionIDsOrdered("repeating_skills", function(ids) {
        skillIdOrder = ids;
        console.debug("refreshSkillOrder - new skillIdOrder:", skillIdOrder);
    });
}

function addBalancingSkillRow() {
    var newId = generateRowID();
    console.debug(`addBalancingSkillRow - newId:${newId}`);
    var newAttributes = {};
    newAttributes[`repeating_skills_${newId}_attribute`] = "-";
    setAttrs(newAttributes);

    skillIdOrder.push(newId.toLowerCase());
    console.debug("addBalancingSkillRow - new skillIdOrder:", skillIdOrder);
    return newId;
}

function getSectionIDsOrdered(sectionName, callback) {
    'use strict';
    getAttrs([`_reporder_${sectionName}`], function (v) {
        getSectionIDs(sectionName, function (idArray) {
            let reporderArray = v[`_reporder_${sectionName}`] ? v[`_reporder_${sectionName}`].toLowerCase().split(',') : [],
                ids = [...new Set(reporderArray.filter(x => idArray.includes(x)).concat(idArray))];
            callback(ids);
        });
    });
};

function bulkCalculateSkills(inputAttributes) {
    getAttrs(inputAttributes.concat(attributes), function(values) {
        console.debug("bulkCalculateSkills with values", values);
        let result = {};
        for (const key of Object.keys(values).filter(key => key.endsWith("_value"))) {
            let prefix = key.replace("_value", "");
            calculateSkill(values, prefix, result);
        }
        console.log("bulk skill calculation result:", result);
        setAttrs(result);
    });
}

function calculateSkill(values, prefix, target) {
    let rawValue = values[prefix + "_value"];
    let value = parseInt(rawValue) || 0;

    const name = values[prefix + "_name"];
    if (name == "Reflexe") {
        target["calc_symlink_" + name] = value;
    }

    let attributeAbbreviation = values[prefix + "_attribute"];

    let result = 0;
    if (attributeAbbreviation != "-") {
        let attributeRawValue = values[attributeAbbreviation];
        let attributeValue = parseInt(attributeRawValue) || 0;

        console.log("calculate " + prefix + " based on values: ", values);
        result = attributeValue + value;
    }
    target[prefix + "_calc_total"] = result;
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

for (const domain of domains) {
    addRowListener(domain);
    for (const technique of techniques) {
        addCellListener(domain, technique);
    }
}

for (const technique of techniques) {
    addColumnListener(technique);
}

function addCellListener(domain, technique) {
    var combination = domain + "_" + technique;
    on("change:" + combination, function() {
        console.log("cell change", domain, technique);
        getAttrs([domain, technique, combination], function(values) {
            let integers = getIntegersFrom(values);
            let result = {};
            calculateMagicCell(integers, domain, technique, result);
            setAttrs(result);
        });
    });
}

function addRowListener(domainName) {
    var inputAttributes = MAGIC_MATRIX_INPUT.concat(techniques.map(techniqueName => domainName + '_' + techniqueName));
    on("sheet:opened change:" + domainName, function() {
        console.log("row change", domainName);
        getAttrs(inputAttributes, function(values) {
            let integers = getIntegersFrom(values);
            let result = {};

            for (const techniqueName of techniques) {
                calculateMagicCell(integers, domainName, techniqueName, result);
            }

            calculateDrainRoll(integers, domainName, values.drain_attribute, result);

            setAttrs(result);
        });
    });
}

function addColumnListener(technique) {
    var inputAttributes = [technique].concat(domains, domains.map(domain => domain + "_" + technique));
    on("change:" + technique, function() {
        console.log("column change", technique);
        getAttrs(inputAttributes, function(values) {
            let integers = getIntegersFrom(values);
            let result = {};
            for (const domain of domains) {
                calculateMagicCell(integers, domain, technique, result);
            }
            setAttrs(result);
        });
    });
}

function calculateMagicCell(integers, domain, technique, result) {
    var total = "";
    if (integers[domain] && integers[technique]) {
        total = integers[domain] + integers[technique] + integers[domain + "_" + technique];
    }
    result["calc_total_" + domain + "_" + technique] = total;
}

on("sheet:opened change:drain_attribute", function(eventInfo) {
    getAttrs(DOMAINS_AND_DRAIN_RELATED, function(values) {
        let integers = getIntegersFrom(values);
        let drainAttributeAbbreviation = values.drain_attribute;
        console.log(
            `calculating drain based on attribute ${drainAttributeAbbreviation}=${integers[drainAttributeAbbreviation]}`,
            eventInfo);

        let result = {};
        calculateAllDrainRolls(integers, drainAttributeAbbreviation, result);
        setAttrs(result);
    });
});

function calculateAllDrainRolls(integers, drainAttributeAbbreviation, resultAttributes) {
    for (const domainName of domains) {
        calculateDrainRoll(integers, domainName, drainAttributeAbbreviation, resultAttributes);
    }
}

function calculateDrainRoll(integers, domainName, drainAttributeAbbreviation, resultAttributes) {
    resultAttributes["calc_drain_" + domainName] = integers[domainName] + integers[drainAttributeAbbreviation];
}

console.log("AdZ sheetworker initialized");
