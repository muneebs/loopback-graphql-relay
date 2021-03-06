'use strict';

const _ = require('lodash');

const promisify = require('promisify-node');

const utils = require('../utils');
const { connectionFromPromisedArray } = require('graphql-relay');
const allowedVerbs = ['get', 'head'];

module.exports = function getRemoteMethodQueries(model) {
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

        hooks[hookName] = {
          name: hookName,
          description: method.description,
          meta: { relation: true },
          args: acceptingParams,
          type: typeObj.type,
          resolve: (__, args, context, info) => {
            const params = [];

            return utils.checkAccess(args, method, model, context).then((result) => {
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
            // const ctx = Object.assign(context, {
            //   model,
            //   modelName : method.sharedClass.name,
            //   property : method.name,
            //   accessType : method.accessType
            // });

            // return Promise.resolve().then(() => new Promise((resolve, reject) => {
            //   model.checkAccess(context.req.accessToken, args.id, method, ctx, (err, allowed) => {
            //     if (err) {
            //       reject(err);
            //     }
            //     resolve(allowed);
            //   });
            // })).then((result) => {
            //   if (result) {
            //     _.forEach(acceptingParams, (param, name) => {
            //       params.push(args[name]);
            //     });
            //     const wrap = promisify(model[method.name]);

            //     if (typeObj.list) {
            //       return connectionFromPromisedArray(wrap.apply(model, params), args, model);
            //     }

            //     return wrap.apply(model, params);
            //   }
            //   return Promise.reject('Access denied');
            // });
          }
        };
      }
    });
  }

  return hooks;
};
