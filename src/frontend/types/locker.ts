import { MqttMessageType } from '@/types/mqtt'

export type LockerTemplateType = 'generic' | 'uniot_device'

export const LockerTemplate = {
  generic: 'generic' as LockerTemplateType,
  uniotDevice: 'uniot_device' as LockerTemplateType
}

export const LockerTemplateNames = {
  [LockerTemplate.generic]: 'Generic',
  [LockerTemplate.uniotDevice]: 'Uniot Device'
}

export const getLockerTemplateName = (template: string): string => {
  const knownTemplateName = LockerTemplateNames[template]
  return knownTemplateName || template
}

export interface LockerTopic {
  topic: string
  msgType: MqttMessageType
}

export interface LockerSettings {
  name: string
  template: LockerTemplateType
  topics: LockerTopic[]
}

export interface LockerPublication extends LockerTopic {
  message: string
  signed: boolean
}
