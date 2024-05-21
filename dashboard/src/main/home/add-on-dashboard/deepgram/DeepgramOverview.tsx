import React from "react";
import AceEditor from "react-ace";

import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";

const DeepgramOverview: React.FC = () => {
  return (
    <div>
      <Text size={16}>Example usage</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        You can use this model over an auto-generated endpoint from any app
        running on Porter.
      </Text>
      <Spacer y={1} />
      <AceEditor
        value={`curl http://my-model.default.svc.cluster.local:8000/v1/completions
  -H "Content-Type: application/json"
  -d '{
      "prompt": "Long Island City is a",
      "max_tokens": 7,
      "temperature": 0
  }'`}
        theme="porter"
        name="codeEditor"
        readOnly={true}
        height="120px"
        width="100%"
        style={{ borderRadius: "10px", color: "#aaaabb" }}
        showPrintMargin={false}
        showGutter={true}
        highlightActiveLine={false}
      />
    </div>
  );
};

export default DeepgramOverview;
