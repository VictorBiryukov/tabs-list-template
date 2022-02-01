import React, { FC } from 'react'
import { Tabs } from 'antd'

import { GoodTypeList } from './GoodTypeList'
import { OrderList } from './OrderList'

const { TabPane } = Tabs

export const AppTabs: FC = () => {
    return (
        <Tabs style={{ margin: "5px" }}>
            <TabPane key="goods" tab="Goods">
                <GoodTypeList></GoodTypeList>
            </TabPane>
            <TabPane key="orders" tab="Orders">
                <OrderList></OrderList>
            </TabPane>
        </Tabs>
    )

}

