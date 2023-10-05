import { BUILDPACK_TO_NAME } from "main/home/app-dashboard/types/buildpack";
import { z } from "zod";
import {
  DetectedServices,
  defaultSerialized,
  deserializeService,
  serializeService,
  serializedServiceFromProto,
  serviceProto,
  serviceValidator,
} from "./services";
import { Build, PorterApp, Service } from "@porter-dev/api-contracts";
import { match } from "ts-pattern";
import { KeyValueType } from "main/home/cluster-dashboard/env-groups/EnvGroupArray";
import { BuildOptions, buildValidator } from "./build";

// sourceValidator is used to validate inputs for source setting fields
export const sourceValidator = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("github"),
    git_repo_id: z.number().min(1),
    git_branch: z.string().min(1),
    git_repo_name: z.string().min(1),
    porter_yaml_path: z.string().default("./porter.yaml"),
  }),
  z.object({
    type: z.literal("docker-registry"),
    // add branch and repo as undefined to allow for easy checks on changes to the source type
    // (i.e. we want to remove the services if any source fields change)
    git_branch: z.undefined(),
    git_repo_name: z.undefined(),
    image: z.object({
      repository: z.string().min(1),
      tag: z.string().default("latest"),
    }),
  }),
]);
export type SourceOptions = z.infer<typeof sourceValidator>;

export const deletionValidator = z.object({
  serviceNames: z
    .object({
      name: z.string(),
    })
    .array(),
  predeploy: z
    .object({
      name: z.string(),
    })
    .array(),
  envGroupNames: z
    .object({
      name: z.string(),
    })
    .array(),
});

// clientAppValidator is the representation of a Porter app on the client, and is used to validate inputs for app setting fields
export const clientAppValidator = z.object({
  name: z.object({
    readOnly: z.boolean(),
    value: z.string(),
  }),
  envGroups: z
    .object({ name: z.string(), version: z.bigint() })
    .array()
    .default([]),
  services: serviceValidator.array(),
  predeploy: serviceValidator.array().optional(),
  env: z
    .object({
      key: z.string(),
      value: z.string(),
      hidden: z.boolean(),
      locked: z.boolean(),
      deleted: z.boolean(),
    })
    .array()
    .default([]),
  build: buildValidator,
});
export type ClientPorterApp = z.infer<typeof clientAppValidator>;

// porterAppFormValidator is used to validate inputs when creating + updating an app
export const porterAppFormValidator = z.object({
  app: clientAppValidator,
  source: sourceValidator,
  deletions: deletionValidator,
  redeployOnSave: z.boolean().default(false),
});
export type PorterAppFormData = z.infer<typeof porterAppFormValidator>;

// serviceOverrides is used to generate the services overrides for an app from porter.yaml
// this method is only called when a porter.yaml is present and has services defined
export function serviceOverrides({
  overrides,
  useDefaults = true,
}: {
  overrides: PorterApp;
  useDefaults?: boolean;
}): DetectedServices {
  const services = Object.entries(overrides.services)
    .map(([name, service]) => serializedServiceFromProto({ name, service }))
    .map((svc) => {
      if (useDefaults) {
        return deserializeService({
          service: defaultSerialized({
            name: svc.name,
            type: svc.config.type,
          }),
          override: svc,
          expanded: true,
          setDefaults: false,
        });
      }

      return deserializeService({ service: svc, setDefaults: false });
    });

  const validatedBuild = buildValidator
    .default({
      method: "pack",
      context: "./",
      buildpacks: [],
      builder: "",
    })
    .parse(overrides.build);

  if (!overrides.predeploy) {
    return {
      build: validatedBuild,
      services,
    };
  }

  if (useDefaults) {
    return {
      build: validatedBuild,
      services,
      predeploy: deserializeService({
        service: defaultSerialized({
          name: "pre-deploy",
          type: "predeploy",
        }),
        override: serializedServiceFromProto({
          name: "pre-deploy",
          service: overrides.predeploy,
          isPredeploy: true,
        }),
        expanded: true,
      }),
    };
  }

  return {
    build: validatedBuild,
    services,
    predeploy: deserializeService({
      service: serializedServiceFromProto({
        name: "pre-deploy",
        service: overrides.predeploy,
        isPredeploy: true,
      }),
    }),
  };
}

const clientBuildToProto = (build: BuildOptions) => {
  return match(build)
    .with({ method: "pack" }, (b) =>
      Object.freeze({
        method: "pack",
        context: b.context,
        buildpacks: b.buildpacks.map((b) => b.buildpack),
        builder: b.builder,
      })
    )
    .with({ method: "docker" }, (b) =>
      Object.freeze({
        method: "docker",
        context: b.context,
        dockerfile: b.dockerfile,
      })
    )
    .exhaustive();
};

export function clientAppToProto(data: PorterAppFormData): PorterApp {
  const { app, source } = data;

  const services = app.services.reduce((acc: Record<string, Service>, svc) => {
    const serialized = serializeService(svc);
    const proto = serviceProto(serialized);
    acc[svc.name.value] = proto;
    return acc;
  }, {});

  const predeploy = app.predeploy?.[0];

  const proto = match(source)
    .with(
      { type: "github" },
      () =>
        new PorterApp({
          name: app.name.value,
          services,
          envGroups: app.envGroups.map((eg) => ({
            name: eg.name,
            version: eg.version,
          })),
          build: clientBuildToProto(app.build),
          ...(predeploy && {
            predeploy: serviceProto(serializeService(predeploy)),
          }),
        })
    )
    .with(
      { type: "docker-registry" },
      (src) =>
        new PorterApp({
          name: app.name.value,
          services,
          envGroups: app.envGroups.map((eg) => ({
            name: eg.name,
            version: eg.version,
          })),
          image: {
            repository: src.image.repository,
            tag: src.image.tag,
          },
        })
    )
    .exhaustive();

  return proto;
}

const clientBuildFromProto = (proto?: Build): BuildOptions | undefined => {
  if (!proto) {
    return;
  }

  const buildValidation = z
    .discriminatedUnion("method", [
      z.object({
        method: z.literal("pack"),
        context: z.string(),
        buildpacks: z.array(z.string()).default([]),
        builder: z.string(),
      }),
      z.object({
        method: z.literal("docker"),
        context: z.string(),
        dockerfile: z.string(),
      }),
    ])
    .safeParse(proto);

  if (!buildValidation.success) {
    return;
  }

  const build = buildValidation.data;

  return match(build)
    .with({ method: "pack" }, (b) =>
      Object.freeze({
        method: b.method,
        context: b.context,
        buildpacks: b.buildpacks.map((b) => ({
          name: BUILDPACK_TO_NAME[b] ?? b,
          buildpack: b,
        })),
        builder: b.builder,
      })
    )
    .with({ method: "docker" }, (b) =>
      Object.freeze({
        method: b.method,
        context: b.context,
        dockerfile: b.dockerfile,
      })
    )
    .exhaustive();
};

export function clientAppFromProto({
  proto,
  overrides,
  variables = {},
  secrets = {},
}: {
  proto: PorterApp;
  overrides: DetectedServices | null;
  variables?: Record<string, string>;
  secrets?: Record<string, string>;
}): ClientPorterApp {
  const services = Object.entries(proto.services)
    .map(([name, service]) => serializedServiceFromProto({ name, service }))
    .map((svc) => {
      const override = overrides?.services.find(
        (s) => s.name.value === svc.name
      );

      if (override) {
        const ds = deserializeService({
          service: svc,
          override: serializeService(override),
        });
        return ds;
      }
      return deserializeService({ service: svc });
    });

  const predeployList = [];
  const parsedEnv: KeyValueType[] = [
    ...Object.entries(variables).map(([key, value]) => ({
      key,
      value,
      hidden: false,
      locked: false,
      deleted: false,
    })),
    ...Object.entries(secrets).map(([key, value]) => ({
      key,
      value,
      hidden: true,
      locked: true,
      deleted: false,
    })),
  ];

  if (proto.predeploy) {
    predeployList.push(
      deserializeService({
        service: serializedServiceFromProto({
          name: "pre-deploy",
          service: proto.predeploy,
          isPredeploy: true,
        }),
      })
    );
  }
  if (!overrides?.predeploy) {
    return {
      name: {
        readOnly: true,
        value: proto.name,
      },
      services,
      predeploy: predeployList,
      env: parsedEnv,
      envGroups: proto.envGroups.map((eg) => ({
        name: eg.name,
        version: eg.version,
      })),
      build: clientBuildFromProto(proto.build) ?? {
        method: "pack",
        context: "./",
        buildpacks: [],
        builder: "",
      },
    };
  }

  const predeployOverrides = serializeService(overrides.predeploy);
  const predeploy = proto.predeploy
    ? [
        deserializeService({
          service: serializedServiceFromProto({
            name: "pre-deploy",
            service: proto.predeploy,
            isPredeploy: true,
          }),
          override: predeployOverrides,
        }),
      ]
    : undefined;

  return {
    name: {
      readOnly: true,
      value: proto.name,
    },
    services,
    predeploy,
    env: parsedEnv,
    envGroups: proto.envGroups.map((eg) => ({
      name: eg.name,
      version: eg.version,
    })),
    build: clientBuildFromProto(proto.build) ?? {
      method: "pack",
      context: "./",
      buildpacks: [],
      builder: "",
    },
  };
}

export function applyPreviewOverrides({
  app,
  overrides,
}: {
  app: ClientPorterApp;
  overrides: DetectedServices["previews"];
}): ClientPorterApp {
  if (!overrides) {
    return app;
  }

  const services = app.services.map((svc) => {
    const override = overrides.services.find(
      (s) => s.name.value === svc.name.value
    );
    if (override) {
      const ds = deserializeService({
        service: serializeService(svc),
        override: serializeService(override),
      });

      if (ds.config.type == "web") {
        ds.config.domains = [];
      }
      return ds;
    }

    if (svc.config.type == "web") {
      svc.config.domains = [];
    }
    return svc;
  });
  const additionalServices = overrides.services
    .filter((s) => !app.services.find((svc) => svc.name.value === s.name.value))
    .map((svc) => deserializeService({ service: serializeService(svc) }));

  app.services = [...services, ...additionalServices];

  if (app.predeploy) {
    const predeployOverride = overrides.predeploy;
    if (predeployOverride) {
      app.predeploy = [
        deserializeService({
          service: serializeService(app.predeploy[0]),
          override: serializeService(predeployOverride),
        }),
      ];
    }
  }

  const envOverrides = overrides.variables;
  if (envOverrides) {
    const env = app.env.map((e) => {
      const override = envOverrides[e.key];
      if (override) {
        return {
          ...e,
          locked: true,
          value: override,
        };
      }

      return e;
    });

    const additionalEnv = Object.entries(envOverrides)
      .filter(([key]) => !app.env.find((e) => e.key === key))
      .map(([key, value]) => ({
        key,
        value,
        hidden: false,
        locked: true,
        deleted: false,
      }));

    app.env = [...env, ...additionalEnv];
  }

  return app;
}
