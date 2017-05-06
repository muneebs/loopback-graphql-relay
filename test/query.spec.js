'use strict';

const expect = require('chai').expect;
const chai = require('chai')
    .use(require('chai-http'));
const server = require('../server/server');
const gql = require('graphql-tag');
const Promise = require('bluebird');
const cpx = require('cpx');

describe('Queries', () => {

  before(() => Promise.fromCallback(cb => cpx.copy('./data.json', './data/', cb)));

  describe('Single entity', () => {
    it('should execute a single query with relation', () => {
      const query = gql `
            query {
              viewer {
                sites(first: 1) {
                  edges {
                    node {
                      id
                      name
                      owner {
                        username
                      }
                    }
                  }
                }
              }
            }`;
      return chai.request(server)
                .post('/graphql')
                .set('Authorization', '6NJWVfqaWHjgcv3mmuWarSVuUic8WzFSutftH0mADLCZaZeuLlSJYbaHAVC6D3gw')
                .send({
                  query
                })
                .then((res) => {
                  expect(res).to.have.status(200);
                  const result = res.body.data;
                  expect(result.viewer.sites.edges.length).to.equal(1);
                  expect(result.viewer.sites.edges[0].node.name).to.equal('blueeast');
                  expect(result.viewer.sites.edges[0].node.owner.username).to.equal('artalat');
                });
    });
  });

  it('should have a total count of 3', () => {
    const query = gql `
      {
        viewer {
          sites {
            totalCount
          }
        }
      }`;
    return chai.request(server)
            .post('/graphql')
            .set('Authorization', '6NJWVfqaWHjgcv3mmuWarSVuUic8WzFSutftH0mADLCZaZeuLlSJYbaHAVC6D3gw')
            .send({
              query
            })
            .then((res) => {
              expect(res).to.have.status(200);
              expect(res.body.data.viewer.sites.totalCount).to.equal(3);
            });
  });


  it('should sort books by name in descending order', () => {
    const query = gql `
      {
        viewer {
          sites (order: "name DESC") {
            totalCount
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }`;
    return chai.request(server)
            .post('/graphql')
            .set('Authorization', '6NJWVfqaWHjgcv3mmuWarSVuUic8WzFSutftH0mADLCZaZeuLlSJYbaHAVC6D3gw')
            .send({
              query
            })
            .then((res) => {
              expect(res).to.have.status(200);
              expect(res.body.data.viewer.sites.totalCount).to.equal(3);
              expect(res.body.data.viewer.sites.edges[0].node.name).to.equal('xyz');
            });
  });

  it('should return current logged in user', () => {
    const query = gql `
      {
        viewer {
          me { id username email }
        }
      }`;
    return chai.request(server)
            .post('/graphql')
            .set('Authorization', '6NJWVfqaWHjgcv3mmuWarSVuUic8WzFSutftH0mADLCZaZeuLlSJYbaHAVC6D3gw')
            .send({
              query
            })
            .then((res) => {
              expect(res).to.have.status(200);
              expect(res.body.data.viewer.me.username).to.equal('artalat');
              expect(res.body.data.viewer.me.email).to.equal('me@artalat.com');
            });
  });

  describe('Remote hooks', () => {

    it('count', () => {
      const query = gql `
        {
          Author {
            count: AuthorCount
          }
        }`;
      return chai.request(server)
              .post('/graphql')
              .send({
                query
              })
              .then((res) => {
                expect(res).to.have.status(200);
                expect(res.body.data.Author.count).to.be.above(7);
              });
    });


    it('exists', () => {
      const query = gql `
        {
          Author {
            exists: AuthorExists(id: 3) 
          }
        }`;
      return chai.request(server)
              .post('/graphql')
              .send({
                query
              })
              .then((res) => {
                expect(res).to.have.status(200);
                expect(res.body.data.Author.exists).to.equal(true);
              });
    });


    it('findOne', () => {
      const query = gql `
        {
          Author {
            AuthorFindOne(filter: { where: {id: 3}}) {
              id
              first_name
              last_name
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
                expect(res.body.data.Author.AuthorFindOne.first_name).to.equal('Virginia');
                expect(res.body.data.Author.AuthorFindOne.last_name).to.equal('Wolf');
              });
    });


    it('findById', () => {
      const query = gql `
        {
          Author {
            AuthorFindById(id: 3) {
              id
              first_name
              last_name
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
                expect(res.body.data.Author.AuthorFindById.first_name).to.equal('Virginia');
                expect(res.body.data.Author.AuthorFindById.last_name).to.equal('Wolf');
              });
    });


    it('find', () => {
      const query = gql `
        {
          Book {
            BookFind {
              edges {
                node {
                  id
                  name
                }
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
                expect(res.body.data.Book.BookFind.edges.length).to.be.above(2);
              });
    });


    it('should call a remoteHook and return the related data', () => {
      const query = gql `
        {
          Customer {
            CustomerFindById(id: 1) {
              name
              age
              billingAddress {
                id
              }
              emailList {
                id
              }
              accountIds
              orders {
                edges {
                  node {
                    id
                    date
                    description
                  }
                }
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
                expect(res).to.have.deep.property('body.data.Customer.CustomerFindById.name');
                expect(res).to.have.deep.property('body.data.Customer.CustomerFindById.age');
                expect(res).to.have.deep.property('body.data.Customer.CustomerFindById.orders.edges[0].node.id');
                expect(res).to.have.deep.property('body.data.Customer.CustomerFindById.orders.edges[0].node.description');
              });
    });


  });

  describe('Queries with ACL constraints', () => {
    it('should allow access to findById to the owner of the resource', () => {
      const query = gql `
      {
        Site{
          SiteFindById(id:1) {
            id
            name
          }
        }
      }
      `;
      return chai.request(server)
      .post('/graphql')
      .set('Authorization', '6NJWVfqaWHjgcv3mmuWarSVuUic8WzFSutftH0mADLCZaZeuLlSJYbaHAVC6D3gw')
      .send({
        query
      })
      .then((res) => {
        expect(res).to.have.status(200);
        const data = res.body.data;
        expect(data.Site.SiteFindById.id).to.equal('U2l0ZTox');
      });
    });

    it('should deny access to findAll sites', () => {
      const query = gql `
        {
          Site{
            SiteFind{
              edges{
                node{
                  id
                  name
                }
              }
            }
          }
        }`;
      return chai.request(server)
      .post('/graphql')
      .set('Authorization', '6NJWVfqaWHjgcv3mmuWarSVuUic8WzFSutftH0mADLCZaZeuLlSJYbaHAVC6D3gw')
      .send({
        query
      })
      .then((res) => {
        expect(res).to.have.status(200);
        const errors = res.body.errors;
        expect(errors.length).to.equal(1);
        expect(errors[0].message).to.equal('Access denied');
      });
    });
  });
});
