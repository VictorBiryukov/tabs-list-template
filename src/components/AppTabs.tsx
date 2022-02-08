import React, { FC, useState, useRef } from 'react'
import { Button, Form, Input, Layout, Modal, Tabs } from 'antd';

import { useAppContext } from './AppContext'

import { _CreateCustomerInput, CustomerAttributesFragment, useAddCustomerInfoMutation } from '../__generate/graphql-frontend'

import { GoodTypeList } from './GoodTypeList'
import { OrderList } from './OrderList'
import { AllOrderList } from './AllOrderList'


const { TabPane } = Tabs
const { Header, Content } = Layout


type InputParameters = Partial<_CreateCustomerInput>

enum ShowForm {
    None,
    Update
}

function mapToInput(data: CustomerAttributesFragment | undefined): InputParameters {
    const result = { ...data }
    delete result.__typename
    return result
}

export const AppTabs: FC = () => {

    const appContext = useAppContext()

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})

    const [addCustomerInfoMutation] = useAddCustomerInfoMutation()


    if (!inputParameters.id) {
        addCustomerInfoMutation({variables: {customerInput: {id: appContext.userInfo!.email}}}).then(
            result => setInputParameters(mapToInput(result.data!.packet!.updateOrCreateCustomer!.returning!))
        )
    }

    return (

        <Layout>
            <Header>

                <Button onClick={() => setShowForm(ShowForm.Update)}>
                    {appContext.userInfo?.preferred_username + " personal data"}
                </Button>
                <Modal visible={showForm != ShowForm.None}
                    onCancel={() => setShowForm(ShowForm.None)}
                    onOk={() => {
                        addCustomerInfoMutation({variables: {customerInput: Object.assign(inputParameters)}})
                        setShowForm(ShowForm.None)
                    }}
                >
                    <Form>
                        <Form.Item>
                            <Input placeholder="User name"
                                value={inputParameters?.data?.name!}
                                onChange={e => {
                                    const input = { ...inputParameters }
                                    input.data = { name: e.target.value, address: input.data?.address }
                                    setInputParameters(input)
                                }}
                            />
                        </Form.Item>
                        <Form.Item>
                            <Input placeholder="User address"
                                value={inputParameters?.data?.address!}
                                onChange={e => {
                                    const input = { ...inputParameters }
                                    input.data = { name: input.data?.name, address: e.target.value }
                                    setInputParameters(input)
                                }}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            </Header>
            <Content>
                <Tabs style={{ margin: "5px" }}>
                    <TabPane key="goods" tab="Goods">
                        <GoodTypeList></GoodTypeList>
                    </TabPane>
                    <TabPane key="orders" tab="My orders">
                        <OrderList></OrderList>
                    </TabPane>
                    <TabPane key="all_orders" tab="All orders">
                        <AllOrderList></AllOrderList>
                    </TabPane>
                </Tabs>
            </Content>
        </Layout>



    )

}

