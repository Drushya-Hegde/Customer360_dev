import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | undefined;

export async function startTelemetry(): Promise<void> {
  if (process.env.OTEL_SDK_DISABLED === 'true') return;
  sdk = new NodeSDK({
    metricReader: new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }) }),
    instrumentations: [getNodeAutoInstrumentations()]
  });
  await sdk.start();
}
