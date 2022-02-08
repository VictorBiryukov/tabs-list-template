import React, { FC, useState, useRef } from 'react'
import 'antd/dist/antd.css';
import { AppProvider } from './AppProvider'

export const App: FC = () => {

    const initApolloClient = useRef<boolean>(true)

    return (
        <AppProvider appAddress={"http://localhsot:8081"}
            initApolloClient={initApolloClient} />
    )
}