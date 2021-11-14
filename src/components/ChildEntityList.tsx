import React, { FC, useState } from 'react'

import { Button, Form, Input, Modal, Select, Spin, Table } from 'antd'

import { useSearchChildEntityQuery, SearchChildEntityDocument, ChildEntityAttributesFragment, useCreateChildEntityMutation, useUpdateChildEntityMutation, useDeleteChildEntityMutation, _UpdateChildEntityInput } from '../__generate/graphql-frontend'

const { Option } = Select

const columns = [
    {
        title: "Name",
        key: 'name',
        dataIndex: 'name',
    },
    {
        title: "Action",
        key: 'action',
        dataIndex: 'action',
    },
]

enum ShowForm {
    None,
    Create,
    Update
}

interface ChildEntityListProps {
    rootEntityId: string
}

type InputParameters = Partial<_UpdateChildEntityInput>

function mapToInput(data: ChildEntityAttributesFragment | undefined): InputParameters {
    const result = { ...data }
    delete result.__typename
    return result
}

export const ChildEntityList: FC<ChildEntityListProps> = ({ rootEntityId }) => {

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})

    const { data, loading, error } = useSearchChildEntityQuery({
        variables: {
            cond: "it.rootEntity.$id == '" + rootEntityId + "'"
        }
    })
    const childEntityList = data?.searchChildEntity.elems

    const [createChildEntityMutation] = useCreateChildEntityMutation()
    const [updateChildEntityMutation] = useUpdateChildEntityMutation()
    const [deleteChildEntityMutation] = useDeleteChildEntityMutation()

    const changeInputParameters = (params: InputParameters) => {
        var input = { ...inputParameters }
        setInputParameters(Object.assign(input, params))
    }

    const mapToView = (list: typeof childEntityList) => {
        return (
            list?.map(elem => {
                return {
                    key: elem.id ?? "",
                    name: elem.name,
                    action: (<>
                        <Button style={{ margin: "2px" }}
                            key={elem.id}
                            onClick={() => {
                                setInputParameters(mapToInput(elem))
                                setShowForm(ShowForm.Update)
                            }}
                        >Edit
                        </Button>
                        <Button style={{ margin: "2px" }}
                            onClick={() => {
                                deleteChildEntityMutation({
                                    variables: {
                                        id: elem.id
                                    },
                                    update: (store) => {
                                        // rewrite Apollo cache for search query after element delete
                                        store.writeQuery({
                                            query: SearchChildEntityDocument,
                                            variables: {
                                                cond: "it.rootEntity.$id == '" + rootEntityId + "'"
                                            },
                                            data: {
                                                searchChildEntity: {
                                                    elems: childEntityList!.filter(x => x.id !== elem.id)
                                                }
                                            }
                                        })
                                    }
                                })
                            }}
                        >Delete
                        </Button>
                    </>
                    )
                }
            })
        )
    }

    if (loading) return (<Spin tip="Loading..." />);
    if (error) return <p>`Error! ${error.message}`</p>;

    return (
        <>
            <Button type="primary" style={{ margin: "20px" }}
                onClick={() => {
                    setInputParameters({})
                    setShowForm(ShowForm.Create)
                }}>
                Add new childEntity
            </Button>
            <Modal visible={showForm != ShowForm.None}
                onCancel={() => setShowForm(ShowForm.None)}
                onOk={() => {
                    if (showForm == ShowForm.Create) {
                        createChildEntityMutation({
                            variables: {
                                input: Object.assign(inputParameters, { rootEntity: rootEntityId })
                            },
                            update: (store, result) => {
                                // rewrite Apollo cache for search query after new element create
                                store.writeQuery({
                                    query: SearchChildEntityDocument,
                                    variables: {
                                        cond: "it.rootEntity.$id == '" + rootEntityId + "'"
                                    },
                                    data: {
                                        searchChildEntity: {
                                            elems: [, ...childEntityList!, result.data?.packet?.createChildEntity]
                                        }
                                    }
                                })
                            }
                        })
                    } else if (showForm == ShowForm.Update) {
                        updateChildEntityMutation({ variables: { input: Object.assign(inputParameters) as _UpdateChildEntityInput } })
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
                </Form>
            </Modal>
            <Table
                columns={columns}
                dataSource={mapToView(childEntityList)}
            />
        </>
    )




}

