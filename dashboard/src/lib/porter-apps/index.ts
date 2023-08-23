import { buildpackSchema } from "main/home/app-dashboard/types/buildpack";
import { z } from "zod";
import {
  ClientService,
  defaultSerialized,
  deserializeService,
  isPredeployService,
  serializeService,
  serializedServiceFromProto,
  serviceProto,
  serviceValidator,
} from "./services";
import { PorterApp, Service } from "@porter-dev/api-contracts";
import { match } from "ts-pattern";

// buildValidator is used to validate inputs for build setting fields
export const buildValidator = z.object({
  context: z.string().default("./"),
  method: z.enum(["pack", "docker", "registry"]),
  buildpacks: z.array(buildpackSchema),
  builder: z.string(),
  dockerfile: z.string(),
});
export type BuildOptions = z.infer<typeof buildValidator>;

// sourceValidator is used to validate inputs for source setting fields
export const sourceValidator = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("github"),
    git_repo_id: z.number(),
    git_branch: z.string(),
    git_repo_name: z.string(),
    porter_yaml_path: z.string(),
  }),
  z.object({
    type: z.literal("docker-registry"),
    // add branch and repo as undefined to allow for easy checks on changes to the source type
    // (i.e. we want to remove the services if any source fields change)
    git_branch: z.undefined(),
    git_repo_name: z.undefined(),
    image: z.object({
      repository: z.string(),
      tag: z.string().default("latest"),
    }),
  }),
]);
export type SourceOptions = z.infer<typeof sourceValidator>;

// porterAppValidator is the representation of a Porter app on the client, and is used to validate inputs for app setting fields
export const porterAppValidator = z.object({
  name: z.string(),
  services: serviceValidator.array(),
  env: z.record(z.string(), z.string()),
  build: buildValidator,
});
export type ClientPorterApp = z.infer<typeof porterAppValidator>;

// porterAppFormValidator is used to validate inputs when creating + updating an app
export const porterAppFormValidator = z.object({
  app: porterAppValidator,
  source: sourceValidator,
});
export type PorterAppFormData = z.infer<typeof porterAppFormValidator>;

// defaultServicesWithOverrides is used to generate the default services for an app from porter.yaml
// this method is only called when a porter.yaml is present and has services defined
export function defaultServicesWithOverrides({
  overrides,
}: {
  overrides: PorterApp;
}): {
  services: ClientService[];
  predeploy?: ClientService;
} {
  const services = Object.entries(overrides.services)
    .map(([name, service]) => serializedServiceFromProto({ name, service }))
    .map((svc) =>
      deserializeService(
        defaultSerialized({
          name: svc.name,
          type: svc.config.type,
        }),
        svc
      )
    );

  const predeploy = overrides.predeploy
    ? deserializeService(
        defaultSerialized({
          name: "pre-deploy",
          type: "predeploy",
        }),
        serializedServiceFromProto({
          name: "pre-deploy",
          service: overrides.predeploy,
          isPredeploy: true,
        })
      )
    : undefined;

  return {
    services,
    predeploy,
  };
}

export function clientAppToProto(data: PorterAppFormData): PorterApp {
  const { app, source } = data;

  const services = app.services
    .filter((s) => !isPredeployService(s))
    .reduce((acc: Record<string, Service>, svc) => {
      acc[svc.name.value] = serviceProto(serializeService(svc));
      return acc;
    }, {});

  const predeploy = app.services.find((s) => isPredeployService(s));

  const proto = match(source)
    .with(
      { type: "github" },
      () =>
        new PorterApp({
          name: app.name,
          services,
          env: app.env,
          build: {
            context: app.build.context,
            method: app.build.method,
            buildpacks: app.build.buildpacks.map((b) => b.buildpack),
            builder: app.build.builder,
            dockerfile: app.build.dockerfile,
          },
          ...(predeploy && {
            predeploy: serviceProto(serializeService(predeploy)),
          }),
        })
    )
    .with(
      { type: "docker-registry" },
      (src) =>
        new PorterApp({
          name: app.name,
          services,
          env: app.env,
          image: {
            repository: src.image.repository,
            tag: src.image.tag,
          },
        })
    )
    .exhaustive();

  return proto;
}
