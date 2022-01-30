import React, { FC, useState } from 'react'

import { Button, Form, Input, Modal, Select, Spin, Table } from 'antd'

import {
    useSearchTaskQuery,
    SearchTaskDocument,
    TaskAttributesFragment,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useDeleteTaskMutation,
    _UpdateTaskInput,
    MemberAttributesFragment,
    useSearchMemberLazyQuery
} from '../__generate/graphql-frontend'

const { Option } = Select

const columns = [
    {
        title: "Name",
        key: 'name',
        dataIndex: 'name',
    },
    {
        title: "Owner",
        key: 'owner',
        dataIndex: 'owner',
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

interface TaskListProps {
    projectId: string
}

type InputParameters = Partial<_UpdateTaskInput>

function mapToInput(data: TaskAttributesFragment | undefined): InputParameters {
    const result = Object.assign({ ...data }, { owner: data?.id })
    delete result.__typename
    return result
}

export const TaskList: FC<TaskListProps> = ({ projectId }) => {

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})
    const [memberName, setMemberName] = useState<string>()

    const { data, loading, error } = useSearchTaskQuery({
        variables: {
            cond: "it.project.$id == '" + projectId + "'"
        }
    })
    const taskList = data?.searchTask.elems

    const [memberOptions, setMemberOptions] = useState<Array<MemberAttributesFragment> | null>(null)
    const [searchMember, { data: dataM }] = useSearchMemberLazyQuery({
        onCompleted: () => { setMemberOptions(dataM?.searchMember.elems!) }
    })

    let timer: number = 0
    let searchMemberString: string = ""

    const [createTaskMutation] = useCreateTaskMutation()
    const [updateTaskMutation] = useUpdateTaskMutation()
    const [deleteTaskMutation] = useDeleteTaskMutation()

    const changeInputParameters = (params: InputParameters) => {
        var input = { ...inputParameters }
        setInputParameters(Object.assign(input, params))
    }

    const mapToView = (list: typeof taskList) => {
        return (
            list?.map(elem => {
                return {
                    key: elem.id ?? "",
                    name: elem.name,
                    owner: elem.owner?.name,
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
                                deleteTaskMutation({
                                    variables: {
                                        id: elem.id
                                    },
                                    update: (store) => {
                                        // rewrite Apollo cache for search query after element delete
                                        store.writeQuery({
                                            query: SearchTaskDocument,
                                            variables: {
                                                cond: "it.project.$id == '" + projectId + "'"
                                            },
                                            data: {
                                                searchTask: {
                                                    elems: taskList!.filter(x => x.id !== elem.id)
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
                Add new task
            </Button>
            <Modal visible={showForm != ShowForm.None}
                onCancel={() => setShowForm(ShowForm.None)}
                onOk={() => {
                    if (showForm == ShowForm.Create) {
                        createTaskMutation({
                            variables: {
                                input: Object.assign(inputParameters, { project: projectId })
                            },
                            update: (store, result) => {
                                // rewrite Apollo cache for search query after new element create
                                store.writeQuery({
                                    query: SearchTaskDocument,
                                    variables: {
                                        cond: "it.project.$id == '" + projectId + "'"
                                    },
                                    data: {
                                        searchTask: {
                                            elems: [, ...taskList!, result.data?.packet?.createTask]
                                        }
                                    }
                                })
                            }
                        })
                    } else if (showForm == ShowForm.Update) {
                        updateTaskMutation({ variables: { input: Object.assign(inputParameters) as _UpdateTaskInput } })
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
                    <Form.Item label={"Owner"}>
                        <Select
                            showSearch
                            defaultActiveFirstOption={false}
                            showArrow={false}
                            filterOption={false}
                            onSearch={(value) => {
                                if (value) {
                                    searchMemberString = value
                                    if (timer == 0) {
                                        timer = window.setTimeout(
                                            () => searchMember({
                                                variables: { cond: "it.project.$id == '" + projectId + "' && it.name $like '" + searchMemberString + "%'" },

                                            }), 1000)
                                    }
                                }
                            }}
                            notFoundContent={null}
                            onChange={(value, option) => {
                                changeInputParameters({ owner: value!.toString() })
                                // @ts-ignore
                                setMemberName(option.children)

                            }}
                            value={memberName}
                        >
                            {memberOptions?.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
            <Table
                columns={columns}
                dataSource={mapToView(taskList)}
            />
        </>
    )




}

