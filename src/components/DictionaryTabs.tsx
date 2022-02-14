import React, { FC, useState } from 'react'
import { Button, Col, Form, Input, Modal, Row, Spin, Tabs } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';


import { useSearchDictionaryQuery, SearchDictionaryDocument, DictionaryAttributesFragment, useUpdateOrCreateDictionaryMutation, useDeleteDictionaryMutation, _UpdateDictionaryInput, _CreateDictionaryInput, _CreateWordInput } from '../__generate/graphql-frontend'
import { WordList } from './WordList'

const { TabPane } = Tabs

enum ShowForm {
    None,
    Create,
    Update
}

type InputParameters = Partial<_CreateDictionaryInput>

function mapToInput(data: DictionaryAttributesFragment | undefined): InputParameters {
    const result = { ...data }
    delete result.__typename
    return result
}

export const DictionaryTabs: FC = () => {

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})

    const { data, loading, error } = useSearchDictionaryQuery()
    const dictionaryList = data?.searchDictionary.elems

    const [updateOrCreateDictionaryMutation] = useUpdateOrCreateDictionaryMutation()
    const [deleteDictionaryMutation] = useDeleteDictionaryMutation()

    const changeInputParameters = (params: InputParameters) => {
        var input = { ...inputParameters }
        setInputParameters(Object.assign(input, params))
    }

    const getTabs = (list: typeof dictionaryList) => {
        return (
            list?.map(elem => {
                return (
                    <TabPane key={elem.id ?? ""} tab={elem.name}>
                        <Row gutter={12}>
                            <Col span={1}>
                                <Button
                                    onClick={() => {
                                        setInputParameters(mapToInput(elem))
                                        setShowForm(ShowForm.Update)
                                    }}
                                ><EditOutlined /></Button>
                            </Col>
                            <Col span={1}>
                                <Button
                                    key={elem.id ?? ""}
                                    onClick={(e) => {
                                        deleteDictionaryMutation({
                                            variables: {
                                                id: elem.id
                                            },
                                            update: (store) => {
                                                store.writeQuery({
                                                    query: SearchDictionaryDocument,
                                                    data: {
                                                        searchDictionary: {
                                                            elems: dictionaryList!.filter(x => x.id !== elem.id)
                                                        }
                                                    }
                                                })
                                            }
                                        })
                                    }}
                                ><DeleteOutlined /></Button>
                            </Col>
                            <Col span={10}>
                                {elem.descr + " (" + elem.words.count + ")"}
                            </Col>
                        </Row>




                        <WordList dictionaryId={elem.id} />
                    </TabPane>
                )
            })
        )
    }

    if (loading) return (<Spin tip="Loading..." />);
    if (error) return <p>`Error! ${error.message}`</p>;

    return (
        <>
            <Button type="primary" style={{ margin: "5px" }}
                onClick={() => {
                    setInputParameters({})
                    setShowForm(ShowForm.Create)
                }}>
                <PlusOutlined />
            </Button>
            <Modal visible={showForm != ShowForm.None}
                onCancel={() => setShowForm(ShowForm.None)}
                onOk={() => {
                    if (showForm == ShowForm.Create) {

                        updateOrCreateDictionaryMutation({
                            variables: {
                                input: inputParameters as _CreateWordInput
                            },
                            update: (store, result) => {
                                store.writeQuery({
                                    query: SearchDictionaryDocument,
                                    data: {
                                        searchDictionary: {
                                            elems: [, ...dictionaryList!, result.data?.packet?.updateOrCreateDictionary?.returning]
                                        }
                                    }
                                })
                            }
                        })
                    } else if (showForm == ShowForm.Update) {
                        updateOrCreateDictionaryMutation({ variables: { input: Object.assign(inputParameters) as _UpdateDictionaryInput } })
                    }
                    setShowForm(ShowForm.None)
                }}
            >
                <Form>
                    <Form.Item>
                        <Input placeholder="Code"
                            value={inputParameters.id!}
                            onChange={e => changeInputParameters({ id: e.target.value })}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Input placeholder="Name"
                            value={inputParameters.name!}
                            onChange={e => changeInputParameters({ name: e.target.value })}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Input placeholder="Description"
                            value={inputParameters.descr!}
                            onChange={e => changeInputParameters({ descr: e.target.value })}
                        />
                    </Form.Item>
                </Form>
            </Modal>
            <Form style={{ margin: "10px" }}>
                <Form.Item>
                    <Tabs>
                        {getTabs(dictionaryList)}
                    </Tabs>
                </Form.Item>
            </Form>

        </>
    )




}

