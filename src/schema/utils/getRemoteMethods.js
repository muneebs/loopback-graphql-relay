'use strict';

const _ = require('lodash');

const {
  mutationWithClientMutationId
} = require('graphql-relay');

const promisify = require('promisify-node');

const { getType } = require('../../types/type');
const { SCALARS } = require('../../types/generateTypeDefs');

const exchangeTypes = {
  any: 'JSON',
  Any: 'JSON',
  Number: 'Int',
  number: 'Int',
  Object: 'JSON',
  object: 'JSON'
};

function isRemoteMethodAllowed(method, allowedVerbs) {

  let httpArray = method.http;

  if (!_.isArray(method.http)) {
    httpArray = [method.http];
  }

  const results = httpArray.map((item) => {

    const verb = item.verb;

    if (allowedVerbs && !_.includes(allowedVerbs, verb)) {
      return false;
    }

    return true;
  });

  const result = _.includes(results, true);

  return result;
}

module.exports = function(model, allowedVerbs) {

  const hooks = {};

  if (model.sharedClass && model.sharedClass.methods) {
    model.sharedClass.methods().forEach((method) => {
      if (method.name.indexOf('Stream') === -1 && method.name.indexOf('invoke') === -1) {

        if (!isRemoteMethodAllowed(method, allowedVerbs)) {
          return;
        }

        const acceptingParams = {};
        let returnType = 'JSON';

        method.accepts.forEach((param) => {
          let paramType = '';
          if (typeof param.type === 'object') {
            paramType = 'JSON';
          } else if (!SCALARS[param.type.toLowerCase()]) {
            paramType = `${param.type}Input`;
          } else {
            paramType = _.upperFirst(param.type);
          }
          if (param.arg) {
            acceptingParams[param.arg] = {
              type: getType(exchangeTypes[paramType] || paramType)
            };
          }
        });
        if (method.returns && method.returns[0]) {
          if (!SCALARS[method.returns[0].type] && typeof method.returns[0].type !== 'object') {
            returnType = `${method.returns[0].type}`;
          } else {
            returnType = `${_.upperFirst(method.returns[0].type)}`;
            if (typeof method.returns[0].type === 'object') {
              returnType = 'JSON';
            }
          }
        }

        const hookName = `${model.modelName}${_.upperFirst(method.name)}`;
        const type = getType(`${exchangeTypes[returnType] || returnType}`) || getType('JSON');

        hooks[hookName] = mutationWithClientMutationId({
          name: hookName,
          description: method.description,
          meta: { relation: true },
          inputFields: acceptingParams,
          outputFields: {
            obj: {
              type,
              resolve: o => o.obj
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

            return Promise.resolve().then(() => {
              return new Promise((resolve, reject) => {
                model.checkAccess(context.req.accessToken, args.id, method, ctx, (err, allowed) => {
                  if (err) {
                    reject(err);
                  }
                  resolve(allowed);
                });
              });
            }).then((result) => {
              if (result) {
                _.forEach(acceptingParams, (param, name) => {
                  params.push(args[name]);
                });
                if (method.name === 'login') {
                  return promisify(model.login(params[0], params[1])).then(data => ({ obj : data }));
                }
                const wrap = promisify(model[method.name]);
                return wrap.apply(model, params).then(data => ({ obj: data }));
              }
              throw new Error('Access denied');
            });
          }
        });
      }
    });
  }

  return hooks;
};
