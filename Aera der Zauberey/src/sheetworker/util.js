const DOMAINS_AND_DRAIN_RELATED = ["drain_attribute"].concat(drainAttributes, domains);
const MAGIC_MATRIX_INPUT = DOMAINS_AND_DRAIN_RELATED.concat(techniques);

function getIntegersFrom(values) {
    let result = {};
    for (const key of Object.keys(values)) {
        result[key] = parseInt(values[key]) || 0;
    }
    return result;
}
