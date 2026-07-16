# Integrating the CMoney Stock Insights Agent from Backend Services

This guide covers how to invoke the AgentCore Agent from other AWS backend services (Lambda, ECS, API Gateway, Step Functions, etc.).

---

## Agent Endpoint Details

| Field | Value |
|-------|-------|
| Runtime ARN | `arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A` |
| Endpoint | `cmoney_node_ep` |
| Region | `us-east-1` |
| Qualifier | `DEFAULT` |
| Payload Format | Base64-encoded JSON with `prompt` key |
| Response Format | JSON with `result` string field |

---

## Invocation Pattern

### Request

```json
{
  "prompt": "我持有台積電(2330) 10張、鴻海(2317) 20張。分析我的投資組合。"
}
```

### Response

```json
{
  "result": "### 投資風格判斷\n\n根據您的持股組合...",
  "runtimeSessionId": "885352d0-073d-4b6d-aeb3-9f53f970678e",
  "contentType": "application/json",
  "statusCode": 200
}
```

---

## Node.js / TypeScript SDK

### Basic Invocation

```typescript
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

const AGENT_RUNTIME_ARN =
  "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A";
const REGION = "us-east-1";

const client = new BedrockAgentCoreClient({ region: REGION });

async function invokeStockAgent(
  prompt: string,
  sessionId?: string,
): Promise<string> {
  const payload = JSON.stringify({ prompt });

  const command = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: AGENT_RUNTIME_ARN,
    qualifier: "DEFAULT",
    payload,
    ...(sessionId && { sessionId }),
  });

  const response = await client.send(command);

  const bodyStr = new TextDecoder().decode(response.body);
  const result = JSON.parse(bodyStr);
  return result.result ?? bodyStr;
}

// Usage
const analysis = await invokeStockAgent(
  "我持有台積電(2330) 10張、鴻海(2317) 20張。分析我的投資組合。",
);
console.log(analysis);
```

### With Session Continuity (Multi-turn)

```typescript
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

class StockAgentClient {
  private client: BedrockAgentCoreClient;
  private agentArn: string;
  private sessionId?: string;

  constructor(region = "us-east-1") {
    this.client = new BedrockAgentCoreClient({ region });
    this.agentArn =
      "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A";
  }

  async chat(message: string): Promise<string> {
    const command = new InvokeAgentRuntimeCommand({
      agentRuntimeArn: this.agentArn,
      qualifier: "DEFAULT",
      payload: JSON.stringify({ prompt: message }),
      ...(this.sessionId && { sessionId: this.sessionId }),
    });

    const response = await this.client.send(command);
    this.sessionId = response.runtimeSessionId;

    const bodyStr = new TextDecoder().decode(response.body);
    const result = JSON.parse(bodyStr);
    return result.result ?? bodyStr;
  }
}

// Usage
const agent = new StockAgentClient();
console.log(await agent.chat("我持有台積電 2330 十張"));
console.log(await agent.chat("那法人最近在買還是賣？")); // follows up in same session
```

---

## AWS Lambda Integration

### Lambda Function

```typescript
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

const AGENT_RUNTIME_ARN = process.env.AGENT_RUNTIME_ARN!;
const client = new BedrockAgentCoreClient({ region: "us-east-1" });

export const handler = async (event: any) => {
  const body = JSON.parse(event.body ?? "{}");
  const { prompt, session_id } = body;

  if (!prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "prompt is required" }),
    };
  }

  try {
    const command = new InvokeAgentRuntimeCommand({
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      qualifier: "DEFAULT",
      payload: JSON.stringify({ prompt }),
      ...(session_id && { sessionId: session_id }),
    });

    const response = await client.send(command);
    const bodyStr = new TextDecoder().decode(response.body);
    const result = JSON.parse(bodyStr);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis: result.result ?? "",
        session_id: response.runtimeSessionId,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
```

### Lambda IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock-agentcore:InvokeAgentRuntime",
      "Resource": "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A"
    }
  ]
}
```

### Deploy Lambda (CLI)

```bash
# Bundle with bun (from a separate lambda project or inline script)
bun build src/lambda.ts --outdir dist --target node
cd dist && zip ../lambda.zip lambda.js && cd ..

# Create function
aws lambda create-function \
  --function-name cmoney-stock-agent-proxy \
  --runtime nodejs22.x \
  --handler lambda.handler \
  --zip-file fileb://lambda.zip \
  --role arn:aws:iam::414208189972:role/LambdaAgentInvokeRole \
  --environment "Variables={AGENT_RUNTIME_ARN=arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A}" \
  --timeout 120 \
  --region us-east-1
```

---

## API Gateway + Lambda (REST API)

### Architecture

```
Client → API Gateway (REST) → Lambda → AgentCore Runtime → Response
```

### Create API Gateway

```bash
# Create REST API
API_ID=$(aws apigateway create-rest-api \
  --name "CMoney Stock Agent API" \
  --region us-east-1 \
  --query 'id' --output text)

# Get root resource
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID --region us-east-1 \
  --query 'items[0].id' --output text)

# Create /analyze resource
RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part "analyze" \
  --region us-east-1 \
  --query 'id' --output text)

# Create POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --region us-east-1

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:414208189972:function:cmoney-stock-agent-proxy/invocations" \
  --region us-east-1
```

### Client Usage

```bash
curl -X POST https://${API_ID}.execute-api.us-east-1.amazonaws.com/prod/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "我持有台積電 2330 十張和元大高股息 0056 二十張，分析我的投資風格",
    "session_id": null
  }'
```

---

## ECS / Fargate Service Integration

### Elysia Service (matches monorepo style)

```typescript
import { Elysia } from "elysia";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

const AGENT_RUNTIME_ARN =
  "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A";
const client = new BedrockAgentCoreClient({ region: "us-east-1" });

const app = new Elysia()
  .post("/v1/analyze", async ({ body }) => {
    const { prompt, session_id } = body as {
      prompt: string;
      session_id?: string;
    };

    if (!prompt) {
      return { error: "prompt is required" };
    }

    const command = new InvokeAgentRuntimeCommand({
      agentRuntimeArn: AGENT_RUNTIME_ARN,
      qualifier: "DEFAULT",
      payload: JSON.stringify({ prompt }),
      ...(session_id && { sessionId: session_id }),
    });

    const response = await client.send(command);
    const bodyStr = new TextDecoder().decode(response.body);
    const result = JSON.parse(bodyStr);

    return {
      analysis: result.result ?? "",
      session_id: response.runtimeSessionId ?? "",
    };
  })
  .get("/health", () => ({ status: "healthy" }))
  .listen(3000);

console.log(`Agent service listening on :${app.server?.port}`);
```

### ECS Task Role Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock-agentcore:InvokeAgentRuntime",
      "Resource": "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A"
    }
  ]
}
```

---

## Step Functions Integration

### State Machine Definition

```json
{
  "Comment": "Portfolio analysis workflow with stock agent",
  "StartAt": "ParsePortfolio",
  "States": {
    "ParsePortfolio": {
      "Type": "Pass",
      "Parameters": {
        "prompt.$": "States.Format('我持有以下股票：{}。請分析我的投資組合的產業集中度、報酬表現、法人動向和潛在風險。', $.portfolio_description)"
      },
      "Next": "InvokeAgent"
    },
    "InvokeAgent": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:bedrockagentcore:invokeAgentRuntime",
      "Parameters": {
        "AgentRuntimeArn": "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A",
        "Qualifier": "DEFAULT",
        "Payload.$": "States.JsonToString(States.JsonMerge(States.StringToJson('{}'), States.StringToJson(States.Format('{\"prompt\": \"{}\"}', $.prompt))))"
      },
      "ResultPath": "$.agentResponse",
      "Next": "FormatOutput"
    },
    "FormatOutput": {
      "Type": "Pass",
      "Parameters": {
        "analysis.$": "$.agentResponse.result",
        "session_id.$": "$.agentResponse.runtimeSessionId"
      },
      "End": true
    }
  }
}
```

### Alternative: Use Lambda as Step Functions Task

```json
{
  "InvokeAgent": {
    "Type": "Task",
    "Resource": "arn:aws:lambda:us-east-1:414208189972:function:cmoney-stock-agent-proxy",
    "Parameters": {
      "body.$": "States.JsonToString($.input)"
    },
    "TimeoutSeconds": 120,
    "Next": "ProcessResult"
  }
}
```

---

## Direct SDK Call (AWS CLI)

```bash
# Invoke from any service with AWS credentials
PAYLOAD=$(echo -n '{"prompt": "分析台積電 2330 的法人動向和買點位置"}' | base64 -w 0)

aws bedrock-agentcore invoke-agent-runtime \
  --agent-runtime-arn "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A" \
  --qualifier "DEFAULT" \
  --payload "$PAYLOAD" \
  --region us-east-1 \
  output.json

cat output.json | jq -r '.result'
```

### Node.js Script (Direct)

```typescript
#!/usr/bin/env bun
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

const client = new BedrockAgentCoreClient({ region: "us-east-1" });

const command = new InvokeAgentRuntimeCommand({
  agentRuntimeArn:
    "arn:aws:bedrock-agentcore:us-east-1:414208189972:runtime/cmoney_stock_node-J4sKEEDt4A",
  qualifier: "DEFAULT",
  payload: JSON.stringify({ prompt: "分析台積電 2330 的法人動向和買點位置" }),
});

const response = await client.send(command);
const body = JSON.parse(new TextDecoder().decode(response.body));
console.log(body.result);
```

---

## Bypassing the Agent: Direct OpenSearch Query

If you only need data retrieval without the FM analysis layer, query OpenSearch Serverless directly with SigV4-signed requests:

```typescript
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";

const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT!;
const REGION = "us-east-1";

const signer = new SignatureV4({
  service: "aoss",
  region: REGION,
  credentials: defaultProvider(),
  sha256: Sha256,
});

async function queryStockData(index: string, body: object): Promise<unknown> {
  const url = new URL(`/${index}/_search`, OPENSEARCH_ENDPOINT);
  const request = new HttpRequest({
    method: "POST",
    hostname: url.hostname,
    path: url.pathname,
    headers: { host: url.hostname, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const signed = await signer.sign(request);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: signed.headers as Record<string, string>,
    body: JSON.stringify(body),
  });

  return res.json();
}

// Example: Get institutional trading for TSMC (2330)
const results = await queryStockData("stock-institutional", {
  query: { term: { stock_code: "2330" } },
  size: 10,
  sort: [{ date: { order: "desc" } }],
});
console.log(results);
```

### Available Indices

| Index | Content |
|-------|---------|
| `stock-summary` | Company overview and fundamentals |
| `stock-price` | Historical price data |
| `stock-institutional` | Institutional (法人) trading data |
| `stock-returns` | Return metrics |
| `stock-momentum` | Technical momentum indicators |
| `stock-forum` | Social discussion sentiment |
| `stock-dividend` | Dividend history |
| `stock-industry` | Industry classification |

### OpenSearch IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "aoss:APIAccessAll",
      "Resource": "arn:aws:aoss:us-east-1:414208189972:collection/<collection-id>"
    }
  ]
}
```

> **Note:** You must also be listed in the OpenSearch Serverless data access policy for the collection.

---

## Error Handling & Retry

### Recommended Retry Configuration

```typescript
import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";

const client = new BedrockAgentCoreClient({
  region: "us-east-1",
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: 120_000,
    connectionTimeout: 10_000,
  },
});
```

### Common Errors

| Error | Cause | Action |
|-------|-------|--------|
| `ThrottlingException` | Rate limit hit | Exponential backoff (handled by SDK retry) |
| `AccessDeniedException` | Missing IAM permissions | Add `bedrock-agentcore:InvokeAgentRuntime` |
| `ValidationException` | Invalid payload format | Ensure JSON with `prompt` key |
| `RuntimeClientError: 500` | Agent code error | Check CloudWatch logs |

---

## Security Considerations

1. **Least-privilege IAM** — Only grant `bedrock-agentcore:InvokeAgentRuntime` on the specific runtime ARN
2. **VPC isolation** — If your backend runs in a VPC, the agent's network mode is PUBLIC; consider using VPC endpoints for Bedrock services
3. **Input validation** — Sanitize user input before passing to the agent prompt
4. **Rate limiting** — Implement application-level rate limiting to control costs
5. **Audit logging** — AgentCore automatically logs to CloudWatch; enable CloudTrail for API-level audit

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Cold start (first invoke after idle) | <1 second |
| Warm invoke (OpenSearch query + FM generation) | 8-20 seconds |
| Idle timeout (session auto-stop) | 600 seconds (configurable) |
| Max session lifetime | 3600 seconds |
| Concurrent sessions | Managed by AgentCore (auto-scales) |

### Optimization Tips

- The Node.js runtime delivers sub-second cold starts — no keep-alive strategies needed
- Use **session continuity** to maintain context across turns
- For latency-sensitive paths, query **OpenSearch Serverless directly** and handle generation in your own service
- Pre-fetch stock data for known portfolios and cache results (TTL: 24h since data is 2025 snapshot)

---

*Last updated: 2026-07-14*
