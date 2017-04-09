'use strict';

const _ = require('lodash');

const {
  mutationWithClientMutationId
} = require('graphql-relay');

const { GraphQLObjectType } = require('graphql');

const { getType } = require('../types/type');
const getRemoteMethods = require('./utils/getRemoteMethods');

/**
 * Create basic save and delete methods for all shared models
 * @param {*} model
 */
function saveAndDeleteMethods(model) {
  const fields = {};

  if (!model.shared) {
    return;
  }

  const saveFieldName = `${_.lowerFirst(model.modelName)}Save`;
  const deleteFieldName = `${_.lowerFirst(model.modelName)}Delete`;
  const InputModelName = `${model.modelName}Input`;

  fields[saveFieldName] = mutationWithClientMutationId({
    name: saveFieldName,
    inputFields: {
      obj: {
        type: getType(InputModelName)
      },
    },
    outputFields: {
      obj: {
        type: getType(model.modelName),
        resolve: o => o
      },
    },
    mutateAndGetPayload: ({ obj }) => model.upsert(Object.assign({}, obj))
  });

  fields[deleteFieldName] = mutationWithClientMutationId({
    name: deleteFieldName,
    inputFields: {
      obj: {
        type: getType(InputModelName)
      },
    },
    mutateAndGetPayload: ({ obj }) => model.findById(obj.id).then(instance => instance.destroy())
  });

  return fields;
}

module.exports = function(models) {

  const modelFields = {};
  _.forEach(models, (model) => {

    const fields = Object.assign({},
      getRemoteMethods(model, ['post', 'delete', 'put', 'patch']),
      saveAndDeleteMethods(model)
    );

    if (_.size(fields) === 0) {
      return;
    }

    modelFields[_.upperFirst(model.modelName)] = {
      resolve: (root, args, context) => ({}),
      type: new GraphQLObjectType({
        name: `${model.modelName}Mutations`,
        description: model.modelName,
        fields
      })
    };

  });

  return new GraphQLObjectType({
    name: 'Mutation',
    fields: modelFields
  });
};
