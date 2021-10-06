import React, { useContext, useEffect, useState } from "react";
import { CustomerProvider, PlanSelect } from "@ironplans/react";
import api from "shared/api";
import { Context } from "shared/Context";

function BillingPage() {
  const [customerToken, setCustomerToken] = useState("");
  const { currentProject, setCurrentError } = useContext(Context);

  useEffect(() => {
    let isSubscripted = true;
    api
      .getCustomerToken("<token>", {}, { project_id: currentProject?.id })
      .then((res) => {
        if (isSubscripted) {
          const token = res?.data?.token;
          setCustomerToken(token);
        }
      })
      .catch((err) => {
        setCurrentError(err);
      });
    return () => {
      isSubscripted = false;
    };
  }, [currentProject?.id]);

  return (
    <div style={{ height: "1000px" }}>
      <CustomerProvider token={customerToken}>
        <PlanSelect
          theme={{
            base: {
              darkMode: "on",
              primaryColor: "white",
              fontFamily: "sans-serif",
            },
          }}
        ></PlanSelect>
      </CustomerProvider>
    </div>
  );
}

export default BillingPage;
