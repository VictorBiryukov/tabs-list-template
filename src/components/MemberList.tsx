import React, { FC, useState } from 'react'

import { Button, Form, Input, Modal, Select, Spin, Table, Tag } from 'antd'

import {
    useSearchMemberQuery,
    SearchMemberDocument,
    MemberAttributesFragment,
    useCreateMemberMutation,
    useUpdateMemberMutation,
    useDeleteMemberMutation,
    _UpdateMemberInput,
    _En_ProjectMemberRole
} from '../__generate/graphql-frontend'

const { Option } = Select

const columns = [
    {
        title: "Name",
        key: 'name',
        dataIndex: 'name',
    },
    {
        title: "Roles",
        key: 'roles',
        dataIndex: 'roles',
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

interface MemberListProps {
    projectId: string
}

type InputParameters = Partial<_UpdateMemberInput>

function mapToInput(data: MemberAttributesFragment | undefined): InputParameters {
    const result = Object.assign({ ...data }, { roles: data?.roles.elems })
    delete result.__typename
    return result
}

export const MemberList: FC<MemberListProps> = ({ projectId }) => {

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})

    const { data, loading, error } = useSearchMemberQuery({
        variables: {
            cond: "it.project.$id == '" + projectId + "'"
        }
    })
    const memberList = data?.searchMember.elems

    const [createMemberMutation] = useCreateMemberMutation()
    const [updateMemberMutation] = useUpdateMemberMutation()
    const [deleteMemberMutation] = useDeleteMemberMutation()

    const changeInputParameters = (params: InputParameters) => {
        var input = { ...inputParameters }
        setInputParameters(Object.assign(input, params))
    }

    const mapToView = (list: typeof memberList) => {
        return (
            list?.map(elem => {
                return {
                    key: elem.id ?? "",
                    name: elem.name,
                    roles: elem.roles.elems.map(role => (<Tag key={role}>{role}</Tag>)),
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
                                deleteMemberMutation({
                                    variables: {
                                        id: elem.id
                                    },
                                    update: (store) => {
                                        // rewrite Apollo cache for search query after element delete
                                        store.writeQuery({
                                            query: SearchMemberDocument,
                                            variables: {
                                                cond: "it.project.$id == '" + projectId + "'"
                                            },
                                            data: {
                                                searchMember: {
                                                    elems: memberList!.filter(x => x.id !== elem.id)
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
                Add new member
            </Button>
            <Modal visible={showForm != ShowForm.None}
                onCancel={() => setShowForm(ShowForm.None)}
                onOk={() => {
                    if (showForm == ShowForm.Create) {
                        createMemberMutation({
                            variables: {
                                input: Object.assign(inputParameters, { project: projectId })
                            },
                            update: (store, result) => {
                                // rewrite Apollo cache for search query after new element create
                                store.writeQuery({
                                    query: SearchMemberDocument,
                                    variables: {
                                        cond: "it.project.$id == '" + projectId + "'"
                                    },
                                    data: {
                                        searchMember: {
                                            elems: [, ...memberList!, result.data?.packet?.createMember]
                                        }
                                    }
                                })
                            }
                        })
                    } else if (showForm == ShowForm.Update) {
                        updateMemberMutation({ variables: { input: Object.assign(inputParameters) as _UpdateMemberInput } })
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
                    <Form.Item label="Member roles">
                        <Select
                            mode="multiple"
                            placeholder="Select roles"
                            value={inputParameters.roles as _En_ProjectMemberRole[]}
                            onChange={selectedRoles => changeInputParameters({ roles: selectedRoles })}
                        >
                            {Object.keys(_En_ProjectMemberRole).map(item => (
                                <Option key={item} value={_En_ProjectMemberRole[item as keyof typeof _En_ProjectMemberRole]}>
                                    {item}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
            <Table
                columns={columns}
                dataSource={mapToView(memberList)}
            />
        </>
    )




}

