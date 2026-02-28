export type Organization = {
  id: string;
  name: string;
};

export type OrgContextType = {
  organizations: Organization[];
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization) => void;
  loading: boolean;
};

