import React, { FC, useState } from 'react'
import { gql, useApolloClient } from '@apollo/client';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

import { Button, Col, Form, Input, InputNumber, Modal, Row, Select, Spin, Table, Upload, UploadProps } from 'antd'

import { useSearchWordQuery, SearchWordDocument, WordAttributesFragment, useUpdateOrCreateWordMutation, useDeleteWordMutation, _CreateWordInput, _CreateDictionaryInput } from '../__generate/graphql-frontend'

const { Option } = Select
const { Search } = Input

const columns = [
    {
        title: "Word",
        key: 'word',
        dataIndex: 'word',
    },
    {
        title: "Letters count",
        key: 'lettersCnt',
        dataIndex: 'lettersCnt',
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

interface WordListProps {
    dictionaryId: string
}

type InputParameters = Partial<_CreateWordInput>

function mapToInput(data: WordAttributesFragment | undefined): InputParameters {
    const result = { ...data }
    delete result.__typename
    return result
}

export const WordList: FC<WordListProps> = ({ dictionaryId }) => {

    const [uploadPacketSize, setUploadPacketSize] = useState<number>(128)

    const client = useApolloClient()

    const [uploadInfo, setUploadInfo] = useState<string>()

    const [inputSearch, setInputSearch] = useState<string>("")

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})

    const { data, loading, error } = useSearchWordQuery({
        variables: {
            limit: 100,
            cond: "it.dictionary.$id == '" + dictionaryId + "' && it.$id $like '" + inputSearch.toLowerCase() + "%'",
        }
    })
    const wordList = data?.searchWord.elems

    const [updateOrCreateWordMutation] = useUpdateOrCreateWordMutation()
    const [deleteWordMutation] = useDeleteWordMutation()

    const changeInputParameters = (params: InputParameters) => {
        var input = { ...inputParameters }
        setInputParameters(Object.assign(input, params))
    }

    // recursive upload portion of words
    const uploadWordsPortion = (words: string[], wordsLength: number, alreadyUploaded: number) => {

        const nextMax = Math.min(alreadyUploaded + uploadPacketSize, wordsLength)

        if (nextMax > alreadyUploaded) {

            // prepare mutation 
            var gqlStr = "mutation loadDictionaryPacket{packet {\n"
            for (var i = alreadyUploaded; i < nextMax; i++) {
                if (words[i]) {
                    const wrd = words[i].replace('\r', '')
                        .replace(/["']/g, "`")
                        .toLowerCase()

                    gqlStr = gqlStr
                        .concat("o" + i + ": updateOrCreateWord(input:{dictionary:\"" + dictionaryId + "\"" +
                            ",id:\"" + wrd + "\"" +
                            ",lettersCnt:" + wrd.length + "" +
                            "}){returning{id},created}\n"
                        )
                }
            }
            gqlStr = gqlStr.concat("}}")

            // execute mutation
            client.mutate({ mutation: gql(gqlStr) })
                .then(result => {
                    console.log("Loaded: " + nextMax)
                    setUploadInfo("Uploading progress: " + nextMax + "/" + wordsLength)
                    uploadWordsPortion(words, wordsLength, nextMax)
                })
        }
        else {
            setUploadInfo("Totaly uploaded: " + nextMax)
            client.reFetchObservableQueries()
        }
    }

    const parseAndUploadWords: UploadProps = {
        name: 'words.txt',
        accept: ".txt",
        showUploadList: false,
        beforeUpload: (file: File) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const allWords: string[] = (e.target!.result! as string).split('\n')
                uploadWordsPortion(allWords, allWords.length, 0)
            };

            reader.readAsText(file)
            // Prevent upload
            return false;
        }
    };

    const mapToView = (list: typeof wordList) => {
        return (
            list?.map(elem => {
                return {
                    key: elem.id ?? "",
                    word: elem.id,
                    lettersCnt: elem.lettersCnt,
                    action: (<>
                        <Button style={{ margin: "2px" }}
                            key={elem.id}
                            onClick={() => {
                                setInputParameters(mapToInput(elem))
                                setShowForm(ShowForm.Update)
                            }}
                        ><EditOutlined />
                        </Button>
                        <Button style={{ margin: "2px" }}
                            onClick={() => {
                                deleteWordMutation({
                                    variables: {
                                        id: elem.id
                                    },
                                    update: (store) => {
                                        // rewrite Apollo cache for search query after element delete
                                        store.writeQuery({
                                            query: SearchWordDocument,
                                            variables: {
                                                limit: 100,
                                                cond: "it.dictionary.$id == '" + dictionaryId + "' && it.$id $like '" + inputSearch.toLowerCase() + "%'"
                                            },
                                            data: {
                                                searchWord: {
                                                    elems: wordList!.filter(x => x.id !== elem.id)
                                                }
                                            }
                                        })
                                    }
                                })
                            }}
                        ><DeleteOutlined />
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
            <div >
                <Row gutter={12} style={{ margin: "5px" }}>
                    <Col span={1}>
                        <Button
                            onClick={() => {
                                setInputParameters({})
                                setShowForm(ShowForm.Create)
                            }}>
                            <PlusOutlined />
                        </Button>
                    </Col>
                    <Col span={4}>
                        <Search placeholder="input search text" onSearch={(value) => setInputSearch(value)} enterButton />
                    </Col>
                    <Col>
                        <InputNumber placeholder="UploadPacketSize"
                            value={uploadPacketSize}
                            onChange={value => setUploadPacketSize(value)}
                        />
                    </Col>
                    <Col span={3}>
                        <Upload {...parseAndUploadWords} maxCount={1}>
                            <Button>Upload dictionary</Button>
                        </Upload>
                    </Col>
                    <Col span={4}>
                        {uploadInfo}
                    </Col>
                </Row>
            </div>
            <Modal visible={showForm != ShowForm.None}
                onCancel={() => setShowForm(ShowForm.None)}
                onOk={() => {
                    if (showForm == ShowForm.Create) {
                        updateOrCreateWordMutation({
                            variables: {
                                input: Object.assign(inputParameters, { dictionary: dictionaryId }) as _CreateWordInput
                            },
                            refetchQueries: ["searchWord"],
                            // update: (store, result) => {
                            //     // rewrite Apollo cache for search query after new element create
                            //     store.writeQuery({
                            //         query: SearchWordDocument,
                            //         variables: {
                            //             limit: 100,
                            //             cond: "it.dictionary.$id == '" + dictionaryId + "' && it.$id $like '" + inputSearch.toLowerCase() + "%'"
                            //         },
                            //         data: {
                            //             searchWord: {
                            //                 elems: [, ...wordList!, result.data?.packet?.updateOrCreateWord?.returning]
                            //             }
                            //         }
                            //     })
                            // }
                        })
                    } else if (showForm == ShowForm.Update) {
                        updateOrCreateWordMutation({ variables: { input: Object.assign(inputParameters) as _CreateWordInput } })
                    }
                    setShowForm(ShowForm.None)
                }}
            >
                <Form>
                    <Form.Item>
                        <Input placeholder="Word"
                            value={inputParameters.id!}
                            onChange={e => changeInputParameters({ id: e.target.value })}
                        />
                    </Form.Item>
                </Form>
            </Modal>
            <Table
                columns={columns}
                dataSource={mapToView(wordList)}
            />
        </>
    )




}

