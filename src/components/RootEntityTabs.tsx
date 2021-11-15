import React, { FC, useState } from 'react'
import { Button, DatePicker, Form, Input, Modal, Spin, Tabs } from 'antd'
import moment from 'moment';

import { useSearchRootEntityQuery, SearchRootEntityDocument, RootEntityAttributesFragment, useCreateRootEntityMutation, useUpdateRootEntityMutation, useDeleteRootEntityMutation, _UpdateRootEntityInput } from '../__generate/graphql-frontend'
import { ChildEntityList } from './ChildEntityList'

const { TabPane } = Tabs

enum ShowForm {
    None,
    Create,
    Update
}

type InputParameters = Partial<_UpdateRootEntityInput>

function mapToInput(data: RootEntityAttributesFragment | undefined): InputParameters {
    const result = { ...data }
    delete result.__typename
    return result
}

export const RootEntityTabs: FC = () => {

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})

    const { data, loading, error } = useSearchRootEntityQuery()
    const rootEntityList = data?.searchRootEntity.elems

    const [createRootEntityMutation] = useCreateRootEntityMutation()
    const [updateRootEntityMutation] = useUpdateRootEntityMutation()
    const [deleteRootEntityMutation] = useDeleteRootEntityMutation()

    const changeInputParameters = (params: InputParameters) => {
        var input = { ...inputParameters }
        setInputParameters(Object.assign(input, params))
    }

    const getTabs = (list: typeof rootEntityList) => {
        return (
            list?.map(elem => {
                return (
                    <TabPane key={elem.id ?? ""} tab={elem.name}>
                        {elem.rootEntityDate}<p />
                        <Button style={{ margin: "10px" }}
                            onClick={() => {
                                setInputParameters(mapToInput(elem))
                                setShowForm(ShowForm.Update)
                            }}
                        >Edit rootEntity</Button>
                        <Button style={{ margin: "10px" }}
                            key={elem.id ?? ""}
                            onClick={(e) => {
                                deleteRootEntityMutation({
                                    variables: {
                                        id: elem.id
                                    },
                                    update: (store) => {
                                        store.writeQuery({
                                            query: SearchRootEntityDocument,
                                            data: {
                                                searchRootEntity: {
                                                    elems: rootEntityList!.filter(x => x.id !== elem.id)
                                                }
                                            }
                                        })
                                    }
                                })
                            }}
                        >Delete rootEntity</Button>
                        <p />
                        <ChildEntityList rootEntityId={elem.id} />
                    </TabPane>
                )
            })
        )
    }

    if (loading) return (<Spin tip="Loading..." />);
    if (error) return <p>`Error! ${error.message}`</p>;

    return (
        <>
            <Button style={{ margin: "20px" }}
                onClick={() => {
                    setInputParameters({})
                    setShowForm(ShowForm.Create)
                }}>
                Add new rootEntity
            </Button>
            <Modal visible={showForm != ShowForm.None}
                onCancel={() => setShowForm(ShowForm.None)}
                onOk={() => {
                    if (showForm == ShowForm.Create) {

                        createRootEntityMutation({
                            variables: {
                                input: inputParameters
                            },
                            update: (store, result) => {
                                store.writeQuery({
                                    query: SearchRootEntityDocument,
                                    data: {
                                        searchRootEntity: {
                                            elems: [, ...rootEntityList!, result.data?.packet?.createRootEntity]
                                        }
                                    }
                                })
                            }
                        })
                    } else if (showForm == ShowForm.Update) {
                        updateRootEntityMutation({ variables: { input: Object.assign(inputParameters) as _UpdateRootEntityInput } })
                    }
                    setShowForm(ShowForm.None)
                }}
            >
                <Form>
                    <Form.Item>
                        <Input placeholder="Name"
                            value={inputParameters.name!}
                            onChange={e => changeInputParameters({ name: e.target.value })}
                        />
                    </Form.Item>
                    <Form.Item>
                        <DatePicker placeholder="RootEntity Date"
                            //defaultValue={moment()}
                            value={inputParameters.rootEntityDate ? moment(inputParameters.rootEntityDate, "YYYY-MM-DD") : null}
                            //value={inputParameters.rootEntityDate}
                            onChange={moment => changeInputParameters({ rootEntityDate: moment?.format("YYYY-MM-DD") })}
                            format="YYYY-MM-DD"

                        />
                    </Form.Item>
                </Form>
            </Modal>
            <Form style={{ margin: "10px" }}>
                <Form.Item>
                    <Tabs>
                        {getTabs(rootEntityList)}
                    </Tabs>
                </Form.Item>
            </Form>

        </>
    )




}

