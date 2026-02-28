import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Organization, OrgContextType } from "@/types/org";
import { useAuth } from "@/hooks/useAuth";

const OrgContext = createContext<OrgContextType | null>(null);

export const OrgProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setOrganizations([]);
        setActiveOrgState(null);
        setLoading(false);
        return;
      }

      const { data, error } = await (supabase as any)
        .from("organization_members")
        .select("organization:organizations(id,name)");

      if (error) {
        console.error("Failed to load organizations", error);
        setOrganizations([]);
        setActiveOrgState(null);
        setLoading(false);
        return;
      }

      const orgs =
        data?.map((x: any) => x.organization).filter(Boolean) ?? [];

      setOrganizations(orgs);

      const savedId = localStorage.getItem("active_org");
      const found = orgs.find((o) => o.id === savedId) ?? orgs[0] ?? null;

      if (found) {
        setActiveOrgState(found);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const setActiveOrg = (org: Organization) => {
    setActiveOrgState(org);
    localStorage.setItem("active_org", org.id);
  };

  const value: OrgContextType = {
    organizations,
    activeOrg,
    setActiveOrg,
    loading,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
};

export const useOrg = () => {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return ctx;
};

