/* eslint-disable no-unused-expressions */

'use strict';

const Promise = require('bluebird');

const expect = require('chai').expect;
const chai = require('chai')
    .use(require('chai-http'));
const server = require('../server/server');
const cpx = require('cpx');

const { fromGlobalId } = require('graphql-relay');

const gql = require('graphql-tag');
// var _ = require('lodash');

describe('Pagination', () => {

  before(() => Promise.fromCallback(cb => cpx.copy('./data.json', './data/', cb)));

  it('should query first 2 entities', () => {
    const query = gql `{
        viewer {
            notes(first: 2) {
            # totalCount
            pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
            }
            edges {
                node {
                title
                id
                }
                cursor
            }
            }
        }
        }
        `;
    return chai.request(server)
            .post('/graphql')
            .send({
              query
            })
            .then((res) => {
              expect(res).to.have.status(200);
              res = res.body.data;
              expect(res.viewer.notes.edges.length).to.be.above(0);
            });
  });

  it('should query entity after cursor', () => {
    const query = gql `{
			viewer {
				notes (after: "YXJyYXljb25uZWN0aW9uOjM=", first: 1){
					pageInfo {
						hasNextPage
						hasPreviousPage
						startCursor
						endCursor
					}
					edges {
						node {
							id
							title
						}
						cursor
					}
				}
			}
		}`;
    return chai.request(server)
            .post('/graphql')
            .send({
              query
            })
            .then((res) => {
              expect(res).to.have.status(200);
              res = res.body.data;
              expect(res.viewer.notes.edges.length).to.be.above(0);
              expect(fromGlobalId(res.viewer.notes.edges[0].node.id).id).to.be.above(4);
              expect(res.viewer.notes.pageInfo.hasNextPage).to.be.true;
            });
  });

  it('should query related entity on edge', () => {
    const query = gql `{
			viewer {
				authors {
					pageInfo {
						hasNextPage
						hasPreviousPage
						startCursor
						endCursor
					}
					edges {
						node {
							id
							last_name
							notes {
								# totalCount
								edges {
									node {
										title
									}
								}
							}
						}
						cursor
					}
				}
			}
		}`;
    return chai.request(server)
            .post('/graphql')
            .send({
              query
            })
            .then((res) => {
              expect(res).to.have.status(200);
              res = res.body.data;
              expect(res.viewer.authors.edges[0].node.notes.edges.length).to.be.above(0);
            //   expect(res.viewer.authors.edges[0].node.notes.totalCount).to.be.above(0);
              expect(res.viewer.authors.edges[0].cursor).not.to.be.empty;
            });
  });

});
