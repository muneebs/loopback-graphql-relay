'use strict';

const _ = require('lodash');

function findOne(model, obj, args, context) {
  const id = obj ? obj[model.getIdName()] : args.id;
  return model.findById(id);
}

function getList(model, obj, args) {
  return model.find(args);
}

function findAll(model, obj, args, context) {
  return getList(model, obj, args);
}

function findRelatedMany(rel, obj, args, context) {
  if (_.isArray(obj[rel.keyFrom])) {
    return Promise.resolve([]);
  }

  return obj[rel.name](args);

  // const where = {
  //   [rel.keyTo]: obj[rel.keyFrom]
  // };

  // args.where = (args.where) ? Object.assign({}, args.where, where) : where;

  // return findAll(rel.modelTo, obj, args, context);
}

function findRelatedOne(rel, obj, args, context) {
  if (_.isArray(obj[rel.keyFrom])) {
    return Promise.resolve([]);
  }
  args = {
    [rel.keyTo]: obj[rel.keyFrom]
  };
  return findOne(rel.modelTo, null, args, context);
}

module.exports = {
  findAll,
  findOne,
  findRelatedMany,
  findRelatedOne
};
