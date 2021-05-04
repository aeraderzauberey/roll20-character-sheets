const DOMAINS_AND_DRAIN_RELATED = ["drain_attribute"].concat(drainAttributes, domains);
const MAGIC_MATRIX_INPUT = DOMAINS_AND_DRAIN_RELATED.concat(techniques);

function getIntegersFrom(values) {
    let result = {};
    for (const key of Object.keys(values)) {
        result[key] = parseInt(values[key]) || 0;
    }
    return result;
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
}

function setAttrsIfNonEmpty(attributes) {
    if (Object.keys(attributes).length > 0) {
        setAttrs(attributes);
    }
}

class RepeatingSection {
    constructor(minimumRowCount, columnCount, key, newRowCreator) {
        this._minimumRowCount = minimumRowCount;
        this._columnCount = columnCount;
        this._newRowCreator = newRowCreator;
        this._sectionName = `repeating_${key}`;
        this._idOrder = [];
        this._removalListener = () => {};

        on("change:_reporder:" + key, eventInfo => {
            console.debug(`${this._sectionName} change - eventInfo:`, eventInfo);
            if (eventInfo.newValue) {
                this._idOrder = eventInfo.newValue.toLowerCase().split(',');
                console.debug(`${this._sectionName} change - new ordering:`, this._idOrder);
            } else {
                console.debug(`${this._sectionName} change - event includes no ordering info`);
                this.refreshOrder();
            }
        });

        on("remove:" + this._sectionName, eventInfo => {
            console.debug(`${this._sectionName} remove - eventInfo:`, eventInfo);

            const regex = new RegExp("^" + this._sectionName + "_([^_]+)$");
            const removedId = eventInfo.sourceAttribute.match(regex)[1];
            console.info("removedId:", removedId);

            // Store last N row IDs before updating idOrder
            const lastFewRowIds = this._idOrder.slice(this._columnCount * -1);
            console.info("last N row IDs:", lastFewRowIds);

            getSectionIDsOrdered(this._sectionName, idOrder => {
                this._idOrder = idOrder;
                console.debug(`${this._sectionName} remove - new ordering:`, this._idOrder);

                var resultAttributes = {};

                const count = idOrder.length;
                if (count < this._minimumRowCount) {
                    const newId = this.addNewRow(resultAttributes);
                    console.info(`user removed a row; appending ${newId} to keep minimum row count`);
                } else if (count % this._columnCount != 0) {
                    const removedRowId = removedId.toLowerCase();
                    if (lastFewRowIds.includes(removedRowId)) {
                        console.info(`user removed row ${removedId}, one of the last ${this._columnCount} rows. balance columns by removing the other rows (if empty) or add a new one`);
                        const remainingRowIds = lastFewRowIds.filter(id => id != removedRowId);
                        this.balanceRowsAfterTailRemoval(remainingRowIds);
                    } else {
                        console.info("user removed non-tail row; appending a new one to keep columns balanced");
                        this.addNewRow(resultAttributes);
                    }
                }

                this._removalListener(eventInfo.removedInfo, resultAttributes);

                setAttrsIfNonEmpty(resultAttributes);
            });
        });
    }

    initialize(callback) {
        getSectionIDsOrdered(this._sectionName, idOrder => {
            this._idOrder = idOrder;
            callback();
        });
    }

    generateMinimumRows(resultAttributes) {
        for (let i = this._idOrder.length; i < this._minimumRowCount; i++) {
            this.addNewRow(resultAttributes);
        }
    }

    addNewRow(resultAttributes) {
        const id = generateRowID();
        this._newRowCreator(this._sectionName + "_" + id, resultAttributes);
        this._idOrder.push(id.toLowerCase());
        return id;
    }

    get idOrder() {
        return this._idOrder;
    }

    onChange(eventHandler) {
        on('change:' + this._sectionName, eventHandler);
    }

    onRemoval(listener) {
        this._removalListener = listener;
    }

    refreshOrder() {
        getSectionIDsOrdered(this._sectionName, idOrder => {
            this._idOrder = idOrder;
            console.debug(`${this._sectionName} refresh - new ordering:`, this._idOrder);
        });
    }

    balanceRowsAfterTailRemoval(remainingRowIds) {
        const inputAttributes = remainingRowIds.flatMap(id => [
            'name', 'value'].map(suffix => `${this._sectionName}_${id}_${suffix}`));
        getAttrs(inputAttributes, values => {
            const rowsAreEmpty = Object.values(values).every((element) => element === "" || element === "-");
            if (rowsAreEmpty) {
                console.info(`other rows ${remainingRowIds} are empty, too - removing.`);

                remainingRowIds.forEach(rowId => {
                    removeRepeatingRow(`${this._sectionName}_${rowId}`);
                });

                this.refreshOrder();
            } else {
                var resultAttributes = {};

                const newId = this.addNewRow(resultAttributes);
                console.info(`not removing the remaining non-empty rows ${remainingRowIds}. keeping columns balanced by adding new row ${newId}.`);

                setAttrs(resultAttributes);
            }
        });
    }
}
