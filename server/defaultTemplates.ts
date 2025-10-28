// Default inspection templates for new organizations
// These templates are automatically created when a new organization is set up

export const DEFAULT_TEMPLATES = [
  {
    name: "Check In",
    description: "To document the condition of a property at the start of a tenancy, recording evidence (photos, notes, etc.) of the property's state as handed over to the tenant.\n\nThis report establishes a baseline for future Check-Out and Maintenance inspections.",
    scope: "property" as const,
    categoryId: null,
    structureJson: {
      sections: [
        {
          id: "section_general_info",
          title: "General Information",
          fields: [
            {
              id: "field_checkin_property_address",
              key: "field_checkin_property_address",
              label: "Property Address",
              type: "long_text",
              required: true,
            },
            {
              id: "field_checkin_tenant_name",
              key: "field_checkin_tenant_name",
              label: "Tenant Name",
              type: "long_text",
              required: false,
            },
            {
              id: "field_checkin_inspection_date",
              key: "field_checkin_inspection_date",
              label: "Date of Inspection",
              type: "date",
              required: true,
            },
            {
              id: "field_checkin_inspector_name",
              key: "field_checkin_inspector_name",
              label: "Inspector Name",
              type: "long_text",
              required: false,
            },
            {
              id: "field_checkin_num_bedrooms",
              key: "field_checkin_num_bedrooms",
              label: "Number of Bedrooms",
              type: "number",
              required: true,
            },
            {
              id: "field_checkin_property_type",
              key: "field_checkin_property_type",
              label: "Property Type",
              type: "select",
              required: true,
              options: ["House", "Apartment", "Townhouse", "Unit", "Studio", "Other"],
            },
          ],
        },
        {
          id: "section_entry_hallway",
          title: "Entry / Hallway",
          fields: [
            {
              id: "field_checkin_entry_condition",
              key: "field_checkin_entry_condition",
              label: "Condition of the Entry / Hallway",
              type: "photo",
              required: false,
            },
          ],
        },
        {
          id: "section_living_room",
          title: "Living Room",
          fields: [
            {
              id: "field_checkin_living_room_condition",
              key: "field_checkin_living_room_condition",
              label: "Living Room Condition",
              type: "photo",
              required: false,
            },
          ],
        },
        {
          id: "section_kitchen",
          title: "Kitchen",
          fields: [
            {
              id: "field_checkin_kitchen_condition",
              key: "field_checkin_kitchen_condition",
              label: "Kitchen Condition",
              type: "photo",
              required: false,
            },
          ],
        },
        {
          id: "section_bedrooms",
          title: "Bedrooms",
          repeatable: true,
          fields: [
            {
              id: "field_checkin_bedroom_condition",
              key: "field_checkin_bedroom_condition",
              label: "Bedroom Condition",
              type: "photo",
              required: false,
            },
          ],
        },
        {
          id: "section_bathrooms",
          title: "Bathrooms",
          repeatable: true,
          fields: [
            {
              id: "field_checkin_bathroom_condition",
              key: "field_checkin_bathroom_condition",
              label: "Bathroom Condition",
              type: "photo",
              required: false,
            },
          ],
        },
        {
          id: "section_signoff",
          title: "Sign-Off",
          fields: [
            {
              id: "field_checkin_inspector_signature",
              key: "field_checkin_inspector_signature",
              label: "Inspector Signature",
              type: "signature",
              required: false,
            },
            {
              id: "field_checkin_tenant_signature",
              key: "field_checkin_tenant_signature",
              label: "Tenant Signature",
              type: "signature",
              required: false,
            },
          ],
        },
      ],
    },
  },
  {
    name: "Check Out",
    description: "A Check-Out Inspection is carried out at the end of a tenancy to assess the property's condition compared to the initial Check-In report. This inspection helps determine if the tenant is liable for any damage or excessive wear beyond normal use.",
    scope: "property" as const,
    categoryId: null,
    structureJson: {
      sections: [
        {
          id: "section_general_info",
          title: "General Information",
          fields: [
            {
              id: "field_checkout_property_address",
              key: "field_checkout_property_address",
              label: "Property Address",
              type: "short_text",
              required: false,
            },
            {
              id: "field_checkout_tenant_name",
              key: "field_checkout_tenant_name",
              label: "Tenant Name",
              type: "short_text",
              required: false,
            },
            {
              id: "field_checkout_inspection_date",
              key: "field_checkout_inspection_date",
              label: "Date of Inspection",
              type: "date",
              required: false,
            },
            {
              id: "field_checkout_inspector_name",
              key: "field_checkout_inspector_name",
              label: "Inspector's Name",
              type: "short_text",
              required: false,
            },
            {
              id: "field_checkout_num_bedrooms",
              key: "field_checkout_num_bedrooms",
              label: "Number of Bedrooms",
              type: "number",
              required: false,
            },
          ],
        },
        {
          id: "section_entry_hallway",
          title: "Entry Hallway",
          fields: [
            {
              id: "field_checkout_entry_door_condition",
              key: "field_checkout_entry_door_condition",
              label: "Door Condition",
              type: "photo[]",
              required: false,
              includeCondition: true,
              includeCleanliness: true,
            },
            {
              id: "field_checkout_entry_floor_condition",
              key: "field_checkout_entry_floor_condition",
              label: "Floor Condition",
              type: "photo[]",
              required: false,
              options: ["Carpet", "Wooden Flooring", "Laminate", "Tile"],
              includeCondition: true,
              includeCleanliness: true,
            },
            {
              id: "field_checkout_entry_comments",
              key: "field_checkout_entry_comments",
              label: "Comments",
              type: "long_text",
              required: false,
            },
          ],
        },
        {
          id: "section_living_room",
          title: "Living Room",
          fields: [
            {
              id: "field_checkout_living_floor_condition",
              key: "field_checkout_living_floor_condition",
              label: "Floor Condition",
              type: "photo[]",
              required: false,
              options: ["Carpet", "Tile", "Wooden Floor", "Laminate"],
              includeCondition: true,
              includeCleanliness: true,
            },
            {
              id: "field_checkout_living_walls_paint",
              key: "field_checkout_living_walls_paint",
              label: "Walls and Paint",
              type: "photo[]",
              required: false,
              includeCondition: true,
              includeCleanliness: true,
            },
            {
              id: "field_checkout_living_comments",
              key: "field_checkout_living_comments",
              label: "Comments",
              type: "long_text",
              required: false,
            },
          ],
        },
        {
          id: "section_kitchen",
          title: "Kitchen",
          fields: [
            {
              id: "field_checkout_kitchen_condition",
              key: "field_checkout_kitchen_condition",
              label: "Kitchen Condition",
              type: "photo[]",
              required: false,
              includeCondition: true,
              includeCleanliness: true,
            },
          ],
        },
        {
          id: "section_bedroom",
          title: "Bedroom",
          repeatable: true,
          fields: [
            {
              id: "field_checkout_bedroom_room_name",
              key: "field_checkout_bedroom_room_name",
              label: "Room Name / Number",
              type: "short_text",
              required: false,
            },
            {
              id: "field_checkout_bedroom_floor_condition",
              key: "field_checkout_bedroom_floor_condition",
              label: "Floor Condition",
              type: "photo[]",
              required: false,
              includeCondition: true,
              includeCleanliness: true,
            },
            {
              id: "field_checkout_bedroom_comments",
              key: "field_checkout_bedroom_comments",
              label: "Comments",
              type: "long_text",
              required: false,
            },
          ],
        },
        {
          id: "section_bathroom",
          title: "Bathroom",
          repeatable: true,
          fields: [
            {
              id: "field_checkout_bathroom_condition",
              key: "field_checkout_bathroom_condition",
              label: "Bathroom Condition",
              type: "photo[]",
              required: false,
              includeCondition: true,
              includeCleanliness: true,
            },
          ],
        },
        {
          id: "section_signoff",
          title: "Sign Off",
          fields: [
            {
              id: "field_checkout_tenant_signature",
              key: "field_checkout_tenant_signature",
              label: "Tenant Signature",
              type: "signature",
              required: false,
            },
            {
              id: "field_checkout_inspector_signature",
              key: "field_checkout_inspector_signature",
              label: "Inspector Signature",
              type: "signature",
              required: false,
            },
            {
              id: "field_checkout_next_inspection",
              key: "field_checkout_next_inspection",
              label: "Next Scheduled Inspection",
              type: "date",
              required: false,
            },
          ],
        },
      ],
    },
  },
];
