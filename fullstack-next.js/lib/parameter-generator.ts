// Parameter Generator - Generates parameter combinations based on mode
export interface Parameter {
  name: string
  type: "query" | "path" | "body" | "header"
  mode: "list" | "cartesian" | "template" | "dynamic"
  values?: string[]
  template?: string
  dynamicConfig?: any
}

export class ParameterGenerator {
  generateCombinations(parameters: Parameter[]): Record<string, any>[] {
    const listParams = parameters.filter((p) => p.mode === "list")
    const cartesianParams = parameters.filter((p) => p.mode === "cartesian")

    if (cartesianParams.length > 0) {
      return this.generateCartesianProduct(cartesianParams)
    }

    if (listParams.length > 0) {
      return this.generateListCombinations(listParams)
    }

    return [{}]
  }

  private generateListCombinations(parameters: Parameter[]): Record<string, any>[] {
    const combinations: Record<string, any>[] = []

    parameters.forEach((param) => {
      if (param.values) {
        param.values.forEach((value) => {
          combinations.push({ [param.name]: value })
        })
      }
    })

    return combinations.length > 0 ? combinations : [{}]
  }

  private generateCartesianProduct(parameters: Parameter[]): Record<string, any>[] {
    const paramValues = parameters.map((p) => ({
      name: p.name,
      values: p.values || [],
    }))

    const cartesian = (arrays: any[][]): any[][] => {
      if (arrays.length === 0) return [[]]
      const [first, ...rest] = arrays
      const restProduct = cartesian(rest)
      return first.flatMap((value: any) => restProduct.map((product) => [value, ...product]))
    }

    const valueArrays = paramValues.map((p) => p.values)
    const products = cartesian(valueArrays)

    return products.map((product) => {
      const combination: Record<string, any> = {}
      paramValues.forEach((param, index) => {
        combination[param.name] = product[index]
      })
      return combination
    })
  }

  generateDynamicValue(parameter: Parameter): string {
    if (parameter.mode === "dynamic" && parameter.dynamicConfig) {
      const { type } = parameter.dynamicConfig

      switch (type) {
        case "date_range":
          return new Date().toISOString().split("T")[0]
        case "timestamp":
          return Date.now().toString()
        case "incremental_id":
          return Math.floor(Math.random() * 1000).toString()
        default:
          return ""
      }
    }

    return ""
  }

  applyTemplate(template: string, variables: Record<string, any>): string {
    let result = template
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value)
    })
    return result
  }
}
