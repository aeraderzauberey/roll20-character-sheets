

for (const domain of domains) {
    addRowListener(domain);
    for (const technique of techniques) {
        addCellListener(domain, technique);
    }
}

for (const technique of techniques) {
    addColumnListener(technique);
}

function addCellListener(domainName, techniqueName) {
    let focus = makeFocusKey(domainName, techniqueName);
    on("change:" + focus, function() {
        console.log("cell change", domainName, techniqueName);
        getAttrs([domainName, techniqueName, focus, makeMagicTotalKey(domainName, techniqueName)], function(values) {
            let integers = getIntegersFrom(values);
            let result = {};
            calculateMagicCell(integers, domainName, techniqueName, result);
            writeAttrs(result);
        });
    });
}

function addRowListener(domainName) {
    var inputAttributes = MAGIC_MATRIX_INPUT.concat(techniques.flatMap(techniqueName => [
        makeFocusKey(domainName, techniqueName), makeMagicTotalKey(domainName, techniqueName)]));
    on("sheet:opened change:" + domainName, function() {
        console.log("row change", domainName);
        getAttrs(inputAttributes, function(values) {
            let integers = getIntegersFrom(values);
            let result = {};

            for (const techniqueName of techniques) {
                calculateMagicCell(integers, domainName, techniqueName, result);
            }

            calculateDrainRoll(integers, domainName, values["drain_attribute"], result);

            writeAttrs(result);
        });
    });
}

function makeFocusKey(domainName, techniqueName) {
    return `${domainName}_${techniqueName}`;
}

function makeMagicTotalKey(domainName, techniqueName) {
    return `calc_total_${domainName}_${techniqueName}`;
}

function addColumnListener(techniqueName) {
    var inputAttributes = [techniqueName].concat(domains, domains.flatMap(domainName => [
        makeFocusKey(domainName, techniqueName), makeMagicTotalKey(domainName, techniqueName)]));
    on("change:" + techniqueName, function() {
        console.log("column change", techniqueName);
        getAttrs(inputAttributes, function(values) {
            let integers = getIntegersFrom(values);
            let result = {};
            for (const domain of domains) {
                calculateMagicCell(integers, domain, techniqueName, result);
            }
            writeAttrs(result);
        });
    });
}

function calculateMagicCell(integers, domainName, techniqueName, resultAttributes) {
    var calculated = "";
    if (integers[domainName] && integers[techniqueName]) {
        calculated = integers[domainName] + integers[techniqueName] + integers[makeFocusKey(domainName, techniqueName)];
    }
    addAttrIfChanged(integers, makeMagicTotalKey(domainName, techniqueName), calculated, resultAttributes)
}

// TODO have one 'sheet:opened' per category which uses a shared getAttrs() (and setAttrs()) call. only the 'change:' listeners must stay separate.
on("sheet:opened change:drain_attribute", function(eventInfo) {
    getAttrs(DOMAINS_AND_DRAIN_RELATED, function(values) {
        let integers = getIntegersFrom(values);
        let drainAttributeAbbreviation = values["drain_attribute"];
        console.log(
            `calculating drain based on attribute ${drainAttributeAbbreviation}=${integers[drainAttributeAbbreviation]}`,
            eventInfo);

        let result = {};
        calculateAllDrainRolls(integers, drainAttributeAbbreviation, result);
        writeAttrs(result);
    });
});

function calculateAllDrainRolls(integers, drainAttributeAbbreviation, resultAttributes) {
    for (const domainName of domains) {
        calculateDrainRoll(integers, domainName, drainAttributeAbbreviation, resultAttributes);
    }
}

function calculateDrainRoll(integers, domainName, drainAttributeAbbreviation, resultAttributes) {
    let key = "calc_drain_" + domainName;
    let calculated = integers[domainName] + integers[drainAttributeAbbreviation];
    addAttrIfChanged(integers, key, calculated, resultAttributes);
}
