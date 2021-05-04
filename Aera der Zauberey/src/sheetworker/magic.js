

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
