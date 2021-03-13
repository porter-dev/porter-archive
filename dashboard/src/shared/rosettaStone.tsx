export const kindToIcon: { [kind: string]: string } = {
  Deployment: "category",
  Pod: "fiber_manual_record",
  Service: "alt_route",
  Ingress: "sensor_door",
  StatefulSet: "location_city",
  Secret: "vpn_key",
  ServiceAccount: "home_repair_service",
  ClusterRole: "person",
  ClusterRoleBinding: "swap_horiz",
  Role: "portrait",
  RoleBinding: "swap_horizontal_circle",
  ConfigMap: "map",
  PodSecurityPolicy: "security"
};

export const edgeColors: { [kind: string]: string } = {
  LabelRel: "#32a85f",
  ControlRel: "#fcb603",
  SpecRel: "#949EFF"
};
