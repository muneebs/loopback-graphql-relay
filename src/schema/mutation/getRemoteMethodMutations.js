'use strict';

const _ = require('lodash');

const {
  mutationWithClientMutationId
} = require('graphql-relay');

const promisify = require('promisify-node');
const { connectionFromPromisedArray } = require('graphql-relay');

const utils = require('../utils');
// const { getType } = require('../../types/type');

const allowedVerbs = ['post', 'del', 'put', 'patch', 'all'];

module.exports = function getRemoteMethodMutations(model) {
  const hooks = {};

  if (model.sharedClass && model.sharedClass.methods) {
    model.sharedClass.methods().forEach((method) => {
      if (method.name.indexOf('Stream') === -1 && method.name.indexOf('invoke') === -1) {

        if (!utils.isRemoteMethodAllowed(method, allowedVerbs)) {
          return;
        }

        // TODO: Add support for static methods
        if (method.isStatic === false) {
          return;
        }

        const typeObj = utils.getRemoteMethodOutput(method);
        const acceptingParams = utils.getRemoteMethodInput(method, typeObj.list);
        const hookName = utils.getRemoteMethodQueryName(model, method);

        hooks[hookName] = mutationWithClientMutationId({
          name: hookName,
          description: method.description,
          meta: { relation: true },
          inputFields: acceptingParams,
          outputFields: {
            obj: {
              type: typeObj.type,
              resolve: o => o
            },
          },
          mutateAndGetPayload: (args, context) => {
            const params = [];

            const ctx = Object.assign(context, {
              model,
              modelName : method.sharedClass.name,
              property : method.name,
              accessType : method.accessType
            });

            return Promise.resolve().then(() => new Promise((resolve, reject) => {
              model.checkAccess(context.req.accessToken, args.id, method, ctx, (err, allowed) => {
                if (err) {
                  reject(err);
                }
                resolve(allowed);
              });
            })).then((result) => {
              if (result) {
                _.forEach(acceptingParams, (param, name) => {
                  params.push(args[name]);
                });
                const wrap = promisify(model[method.name]);

                if (typeObj.list) {
                  return connectionFromPromisedArray(wrap.apply(model, params), args, model);
                }

                return wrap.apply(model, params);
              }
              return Promise.reject('Access denied');
            });

            // _.forEach(acceptingParams, (param, name) => {
            //   params.push(args[name]);
            // });
            // const wrap = promisify(model[method.name]);

            // if (typeObj.list) {
            //   return connectionFromPromisedArray(wrap.apply(model, params), args, model);
            // }

            // return wrap.apply(model, params);
          }
        });
      }
    });
  }

  return hooks;
};