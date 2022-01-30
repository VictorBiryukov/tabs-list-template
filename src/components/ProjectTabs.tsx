import React, { FC, useState } from 'react'
import { Button, DatePicker, Form, Input, Modal, Spin, Tabs } from 'antd'
import moment from 'moment';

import { useSearchProjectQuery, SearchProjectDocument, ProjectAttributesFragment, useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation, _UpdateProjectInput } from '../__generate/graphql-frontend'
import { TaskList } from './TaskList'
import { MemberList } from './MemberList';

const { TabPane } = Tabs

enum ShowForm {
    None,
    Create,
    Update
}

type InputParameters = Partial<_UpdateProjectInput>

function mapToInput(data: ProjectAttributesFragment | undefined): InputParameters {
    const result = { ...data }
    delete result.__typename
    return result
}

export const ProjectTabs: FC = () => {

    const [showForm, setShowForm] = useState<ShowForm>(ShowForm.None)
    const [inputParameters, setInputParameters] = useState<InputParameters>({})

    const { data, loading, error } = useSearchProjectQuery()
    const projectList = data?.searchProject.elems

    const [createProjectMutation] = useCreateProjectMutation()
    const [updateProjectMutation] = useUpdateProjectMutation()
    const [deleteProjectMutation] = useDeleteProjectMutation()

    const changeInputParameters = (params: InputParameters) => {
        var input = { ...inputParameters }
        setInputParameters(Object.assign(input, params))
    }

    const getTabs = (list: typeof projectList) => {
        return (
            list?.map(elem => {
                return (
                    <TabPane key={elem.id ?? ""} tab={elem.name}>
                        {elem.createDate}<p />
                        <Button style={{ margin: "10px" }}
                            onClick={() => {
                                setInputParameters(mapToInput(elem))
                                setShowForm(ShowForm.Update)
                            }}
                        >Edit project</Button>
                        <Button style={{ margin: "10px" }}
                            key={elem.id ?? ""}
                            onClick={(e) => {
                                deleteProjectMutation({
                                    variables: {
                                        id: elem.id
                                    },
                                    update: (store) => {
                                        store.writeQuery({
                                            query: SearchProjectDocument,
                                            data: {
                                                searchProject: {
                                                    elems: projectList!.filter(x => x.id !== elem.id)
                                                }
                                            }
                                        })
                                    }
                                })
                            }}
                        >Delete project</Button>
                        <Form style={{ margin: "10px" }}>
                            <Tabs>
                                <TabPane key="memberTab" tab="Member list">
                                    <MemberList projectId={elem.id} ></MemberList>
                                </TabPane>
                                <TabPane key="taskTab" tab="Task list">
                                    <TaskList projectId={elem.id} />
                                </TabPane>
                            </Tabs>
                        </Form>

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
                Add new project
            </Button>
            <Modal visible={showForm != ShowForm.None}
                onCancel={() => setShowForm(ShowForm.None)}
                onOk={() => {
                    if (showForm == ShowForm.Create) {

                        createProjectMutation({
                            variables: {
                                input: inputParameters
                            },
                            update: (store, result) => {
                                store.writeQuery({
                                    query: SearchProjectDocument,
                                    data: {
                                        searchProject: {
                                            elems: [, ...projectList!, result.data?.packet?.createProject]
                                        }
                                    }
                                })
                            }
                        })
                    } else if (showForm == ShowForm.Update) {
                        updateProjectMutation({ variables: { input: Object.assign(inputParameters) as _UpdateProjectInput } })
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
                        <DatePicker placeholder="Project Date"
                            //defaultValue={moment()}
                            value={inputParameters.createDate ? moment(inputParameters.createDate, "YYYY-MM-DD") : null}
                            //value={inputParameters.createDate}
                            onChange={moment => changeInputParameters({ createDate: moment?.format("YYYY-MM-DD") })}
                            format="YYYY-MM-DD"

                        />
                    </Form.Item>
                </Form>
            </Modal>
            <Form style={{ margin: "10px" }}>
                <Form.Item>
                    <Tabs>
                        {getTabs(projectList)}
                    </Tabs>
                </Form.Item>
            </Form>

        </>
    )




}

