/**
 * Application
 */
import React, { Fragment, useRef } from 'react';
import {
    BryntumDemoHeader,
    BryntumGrid
} from '@bryntum/grid-react';
import { Column, ColumnStore, DataGenerator, Toast } from '@bryntum/grid';

import { useGridProps } from './AppConfig';
import './App.scss';

const App = props => {
    const grid = useRef(null);

    const gridProps = useGridProps();

    //region Register custom column

    // Extend Column to create your own custom column class
    class ColorColumn extends Column {
        // Define the type for this column, used in your columns config to add this column
        static type = 'color';

        // Override default values
        static get defaults() {
            return {
                field : 'color',
                align : 'center',
                items : DataGenerator.colors
            };
        }

        renderer({ value, cellElement }) {
            Object.assign(cellElement.style, {
                backgroundColor : value ? `var(--b-color-${value.toLowerCase()})` : '',
                color : value ? '#fff' : ''
            });

            return value;
        }
    }

    // Register with ColumnStore to make the column available to the grid
    ColumnStore.registerColumnType(ColorColumn);

    //endregion

    return (
        <Fragment>
            {/* BryntumDemoHeader component is used for Bryntum example styling only and can be removed */}
            <BryntumDemoHeader />
            <BryntumGrid
                ref={grid}
                {...gridProps}
            />
        </Fragment>
    );
};

export default App;


Toast.show({
    color : 'b-orange',
    html  : `
     <p>This demo was created with <strong>Create React App</strong> (CRA).</p>
     <p>Since CRA is deprecated, we recommend you to check out our React Vite demos.</p>
`,
    timeout : 10000
});
