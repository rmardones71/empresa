/**
 * Application configuration
 */
import { DataGenerator, StringHelper } from '@bryntum/grid';

export const useGridProps = () => {
    return {
        selectionMode : {
            row      : true,
            checkbox : {
                hideable : false
            },
            showCheckAll : true
        },

        columns : [
            { type : 'rownumber' },
            {
                text     : 'Template',
                field    : 'name',
                flex     : 1,
                type     : 'template',
                template : data => StringHelper.xss`Hi ${data.record.name}!`,
                // Cheaper measuring when sizing to fit content
                fitMode  : 'value',
                editor   : {
                    label : 'Name'
                }
            },
            { text : 'Percent', field : 'percent', flex : 1, type : 'percent' },
            {
                text    : 'Widget',
                width   : 150,
                type    : 'widget',
                cellCls : 'age',
                widgets : [{
                    type     : 'button',
                    text     : 'Add age',
                    flex     : 1,
                    icon     : 'fa fa-plus',
                    color    : 'b-blue',
                    onAction : ({ source: btn }) => {
                        btn.cellInfo.record.age++;
                    }
                }]
            },
            { text : 'Number', field : 'age', width : 100, align : 'right', type : 'number', instantUpdate : true },
            { text : 'Date', field : 'start', flex : 1, type : 'date', format : 'MMMM D YYYY' },
            { text : 'Time', field : 'time', flex : 1, type : 'time', format : 'LT' },
            {
                text : 'Custom',
                type : 'color'
            },
            {
                text     : 'Link',
                field    : 'name',
                type     : 'template',
                editor   : false,
                template : data => `<a href="https://bryntum.com" target="_blank">Click me</a>`
            },
            {
                type    : 'rating',
                text    : 'Rating',
                cellCls : 'satisfaction',
                max     : 5,
                field   : 'rating'
            },
            {
                type    : 'action',
                field   : 'rating',
                actions : [{
                    cls     : 'fa fa-minus-circle',
                    tooltip : 'Decrease rating',
                    onClick : ({ record }) => {
                        if (record.rating > 1) {
                            record.rating--;
                        }
                    }
                }, {
                    cls     : 'fa fa-plus-circle',
                    tooltip : 'Increase rating',
                    onClick : ({ record }) => {
                        if (record.rating < 5) {
                            record.rating++;
                        }
                    }
                }]
            },
            {
                text     : 'Notes',
                field    : 'notes',
                maxWidth : 300,
                editor   : {
                    type : 'textareapickerfield'
                }
            }
        ],

        headerMenuFeature : {
            moveColumns : true
        },

        data : DataGenerator.generateData(50)
    };
};

