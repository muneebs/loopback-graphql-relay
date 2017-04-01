'use strict';

const _ = require('lodash');

function buildSelector(model, args) {
  const selector = {
    where: args.where || {}
  };
  const begin = args.after;
  const end = args.before;

  selector.skip = args.first - args.last || 0;
  selector.limit = args.last || args.first;

  if (model.getIdName && model.getIdName()) {
    selector.order = model.getIdName() + (end ? ' DESC' : ' ASC');
    if (begin) {
      selector.where[model.getIdName()] = selector[model.getIdName()] || {};
      selector.where[model.getIdName()].gt = begin;
    }
    if (end) {
      selector.where[model.getIdName()] = selector[model.getIdName()] || {};
      selector.where[model.getIdName()].lt = end;
    }
  }
  return selector;
}

function findOne(model, obj, args, context) {
  const id = obj ? obj[model.getIdName()] : args.id;
  return model.findById(id);
}

function getList(model, obj, args) {
  return model.find(buildSelector(model, args));
}

function findAll(model, obj, args, context) {
  return getList(model, obj, args);
}

function findRelated(rel, obj, args, context) {
  if (_.isArray(obj[rel.keyFrom])) {
    return Promise.resolve([]);
  }
  args.where = {
    [rel.keyTo]: obj[rel.keyFrom]
  };
  return findAll(rel.modelTo, obj, args, context);

}

module.exports = {
  findAll,
  findOne,
  findRelated
};
