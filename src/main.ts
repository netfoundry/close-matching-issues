import * as core from '@actions/core'
import * as github from '@actions/github'
import { Context } from '@actions/github/lib/context'

import { GitHub } from '@actions/github/lib/utils'

import { formatNameWithOwner } from './utils'

interface IssueNumber {
  number: number
}

interface Repo{
  owner: string;
  repo: string;
}

export type GitHubClient = InstanceType<typeof GitHub>
export type GraphQlQueryResponseData = { [key: string]: any } | null

const query = `
query($searchQuery: String!) {
  search(first: 100, query: $searchQuery, type: ISSUE) {
    nodes {
      ... on Issue {
        number
      }
      ... on PullRequest {
        number
      }
    }
  }
}
`

async function closeIssues(octokit: GitHubClient, repo: Repo, numbers: Array<number>) {

  return numbers.map(async (number) => {
    core.debug(`Close https://github.com/${formatNameWithOwner(repo)}/issues/${number}`)

    return octokit.rest.issues.update({ ...repo, issue_number: number, state: 'closed' })
  })
}

export async function getIssueNumbers(
  octokit: GitHubClient,
  repo: Repo,
  searchQuery: string
): Promise<Array<number>> {
  const queryText = `repo:${formatNameWithOwner(repo)} ${searchQuery}`

  core.debug(`Query: ${queryText}`)

  const results: GraphQlQueryResponseData = await octokit.graphql(query, { searchQuery: queryText })

  core.debug(`Results: ${JSON.stringify(results)}`)

  if (results) {
    return results.search.nodes.map((issue: IssueNumber) => issue.number)
  } else {
    return []
  }
}

async function run() {
  try {
    const token = core.getInput('token')

    if (!token) {
      throw new Error('`token` is a required input parameter')
    }

    const searchQuery = core.getInput('query')

    if (!searchQuery) {
      throw new Error('`query` is a required input parameter')
    }

   


    const octokit = github.getOctokit(token)


    const repoName = core.getInput('repo')
    const ownerName = core.getInput('owner')

    const repo: Repo = {...github.context.repo};
    if(repoName && repoName !== ""){
      repo.repo = repoName;
    }
    if(ownerName && ownerName !== ""){
      repo.owner = ownerName;
    }

    const issueNumbers = await getIssueNumbers(octokit,repo, searchQuery)

    await closeIssues(octokit,repo, issueNumbers)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
