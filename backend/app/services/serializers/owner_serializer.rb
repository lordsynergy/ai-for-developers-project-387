module Serializers
  class OwnerSerializer
    def self.call(owner)
      {
        id: owner.id.to_s,
        name: owner.name,
        timezone: owner.timezone
      }
    end
  end
end
