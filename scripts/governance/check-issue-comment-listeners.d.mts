export interface IssueCommentListener {
  file: string
}

export function listCandidateWorkflowFiles(dir: string): string[]
export function findDirectIssueCommentListeners(workflowsDir: string): IssueCommentListener[]
