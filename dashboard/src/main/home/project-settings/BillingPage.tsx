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
              customFont: "Work Sans",
              fontFamily: '"Work Sans", sans-serif',
              darkMode: "on",
              colors: {
                primary: "rgba(97, 111, 238, 0.8)",
                secondary: "rgb(103, 108, 124)",
                danger: "rgb(227, 54, 109)",
                success: "rgb(56, 168, 138)",
              },
            },
            card: {
              backgroundColor: "rgb(38, 40, 47)",
              boxShadow: "rgb(0 0 0 / 33%) 0px 4px 15px 0px",
              borderRadius: "8px",
              border: "2px solid rgba(158, 180, 255, 0)",
            },
            button: {
              base: {
                boxShadow: "rgb(0 0 0 / 19%) 0px 2px 5px 0px",
                borderRadius: "5px",
                fontSize: "14px",
                fontWeight: "500",
              },
            },
          }}
        ></PlanSelect>
      </CustomerProvider>
    </div>
  );
}

export default BillingPage;
